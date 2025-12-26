from typing import List, AsyncGenerator
import json
import asyncio
from agents.base import Agent
from agents.custom_agent import CustomAgent
from agents.moderator import ModeratorAgent
from services.llm import LLMService
from services.database import DatabaseService
from config.prompts import AGENT_PERSONAS, ROUND_INSTRUCTIONS, SAFETY_PROTOCOL, EVIDENCE_PROTOCOL

class Orchestrator:
    def __init__(self, llm_service: LLMService, db_service: DatabaseService):
        self.llm_service = llm_service
        self.db_service = db_service
        
        # Initialize defaults using CustomAgent and centralized personas
        self.defaults = {}
        for key, persona in AGENT_PERSONAS.items():
            if key == 'moderator': continue # Moderator handled separately
            self.defaults[key] = CustomAgent(
                name=persona['name'],
                role=persona['role'],
                prompt=persona['prompt'],
                llm_service=llm_service
            )
            
        self.moderator = ModeratorAgent(llm_service)

        self.agents: List[Agent] = list(self.defaults.values())

    async def initialize_session_agents(self, agent_ids: List[str] = None):
        """
        Re-initializes self.agents based on request.
        """
        if agent_ids is None:
            # Revert to all defaults if nothing specified (legacy safety)
            self.agents = list(self.defaults.values())
            return

        new_agents = []
        custom_ids = []

        for aid in agent_ids:
            if aid in self.defaults:
                new_agents.append(self.defaults[aid])
            else:
                custom_ids.append(aid)
        
        self.agents = new_agents # Start with requested defaults
        
        # Load requested custom agents
        if custom_ids and self.db_service.get_client():
            try:
                res = self.db_service.get_client().table("custom_agents").select("*").in_("id", custom_ids).execute()
                if res.data:
                    # Sort them to match input order if possible, or just append
                    # Map id -> record
                    record_map = {r['id']: r for r in res.data}
                    for cid in custom_ids:
                         if cid in record_map:
                             r = record_map[cid]
                             self.agents.append(
                                 CustomAgent(r['name'], r['role'], r['prompt'], self.llm_service)
                             )
            except Exception as e:
                print(f"Error loading custom agents: {e}")

    async def _inject_stakeholders(self, topic: str):
        """
        Dynamically identifies and adds stakeholder agents based on the topic.
        """
        prompt = f"""
        Analyze the topic: "{topic}".
        Identify 1-2 key human stakeholders or "affected voices" that are critical to this discussion but purely functional roles (like Optimist/Analyst) might miss.
        Examples: "Teacher" for education, "Patient" for health, "Artist" for AI art.
        
        Output JSON only:
        [
            {{"name": "Stakeholder Name", "role": "Role Description", "prompt": "System prompt for this persona..."}},
            ...
        ]
        """
        try:
            print(f"Injecting stakeholders for: {topic}")
            response = await self.llm_service.generate_response(prompt)
            cleaned = response.replace("```json", "").replace("```", "").strip()
            stakeholders = json.loads(cleaned)
            
            for s in stakeholders:
                print(f"Adding Stakeholder: {s['name']}")
                self.agents.append(CustomAgent(
                    name=s['name'],
                    role=s['role'],
                    prompt=s['prompt'],
                    llm_service=self.llm_service
                ))
        except Exception as e:
            print(f"Error injecting stakeholders: {e}")

    async def run_brainstorming_session(self, topic: str, session_id: str, agent_ids: List[str] = None, assurance_mode: str = 'insight') -> AsyncGenerator[str, None]:
        """
        Runs a brainstorming session.
        Yields SSE events.
        """
        
        # 1. Fetch existing history to restore state
        history = []
        if self.db_service.get_client():
            try:
                # Fetch all responses ordered by creation time
                res = self.db_service.get_client().table("responses").select("*").eq("session_id", session_id).order("created_at").execute()
                if res.data:
                    history = res.data
            except Exception as e:
                print(f"Error fetching history: {e}")

        # Initialize agents for this run
        if agent_ids:
             await self.initialize_session_agents(agent_ids)
        elif not agent_ids and not history:
             # Legacy/Default fallback if starting fresh with no args
             pass 
        
        if not self.agents:
             print("Warning: No agents available for session.")
             yield f"event: token\ndata: {json.dumps({'text': 'System Error: No agents selected for this session.'})}\n\n"
             return

        # --- Stakeholder Injection (Auto) ---
        # Only inject if we have fewer than 6 agents to avoid overcrowding
        if len(self.agents) < 6:
            await self._inject_stakeholders(topic)
            # Notify UI of new agents? The UI only knows what it started with. 
            # Ideally we'd send an event, but the SSE stream handles "agent_intro"? 
            # For now, they just appear in the stream.

        # 2. Reconstruct Context & Replay History
        context = f"Topic: {topic}\n\n[SYSTEM SAFETY]: {SAFETY_PROTOCOL}"
        
        if assurance_mode == 'evidence':
            context += f"\n\n[SYSTEM MODE]: {EVIDENCE_PROTOCOL}"

        
        for record in history:
            a_name = record['agent_name']
            content = record['content']
            
            # Yield existing entity
            yield f"event: agent_start\ndata: {json.dumps({'name': a_name})}\n\n"
            yield f"event: token\ndata: {json.dumps({'text': content})}\n\n"
            yield f"event: agent_end\ndata: {json.dumps({'name': a_name})}\n\n"
            
            context += f"\n\n{a_name}: {content}"

        # 3. Continuous Loop
        # Determine where we are in the cycle
        total_responses = len(history)
        
        while True:
            # Determine which agent is next
            # Use modulo on currently active agents
            if not self.agents:
                break

            agent_index = total_responses % len(self.agents)
            agent = self.agents[agent_index]
            
            # Determine round number (how many full cycles completed)
            round_num = total_responses // len(self.agents)
            
            # Progressive Depth Logic
            # Progressive Depth Logic
            instruction = ROUND_INSTRUCTIONS.get(round_num, ROUND_INSTRUCTIONS["default"])

            conciseness_instruction = " Keep your response concise, on-point, and balanced. Use simple, plain English that is easy to read. Avoid jargon, complex sentence structures, and heavy academic language. Ensure the core idea is clearly explained without overcomplicating it."
            effective_context = f"{context}\n\n[SYSTEM DIRECTIVE]: {instruction}{conciseness_instruction}"
            
            # Yield Start Event
            yield f"event: agent_start\ndata: {json.dumps({'name': agent.name})}\n\n"
            
            # Generate Stream
            response_content = ""
            try:
                async for chunk in agent.generate_stream(effective_context):
                    response_content += chunk
                    yield f"event: token\ndata: {json.dumps({'text': chunk})}\n\n"
            except Exception as e:
                print(f"Error generating response: {e}")
                error_msg = f"[Error: {str(e)}]"
                response_content = error_msg
                yield f"event: token\ndata: {json.dumps({'text': error_msg})}\n\n"

            # Yield End Event
            yield f"event: agent_end\ndata: {json.dumps({'name': agent.name})}\n\n"
            
            # Save to DB
            if self.db_service.get_client():
                try:
                    self.db_service.get_client().table("responses").insert({
                        "session_id": session_id,
                        "agent_name": agent.name,
                        "content": response_content
                    }).execute()
                except Exception as e:
                    print(f"Error saving response: {e}")
            
            # Update Context
            context += f"\n\n{agent.name}: {response_content}"
            total_responses += 1
            
            # --- Moderator Intervention (Every 6 turns) ---
            if total_responses % 6 == 0:
                print("Triggering Moderator Intervention...")
                # 1. Generate Score (Async/Background)
                score_data = await self.moderator.generate_quality_score(context)
                if score_data and self.db_service.get_client():
                    try:
                         self.db_service.get_client().table("quality_scores").insert({
                            "session_id": session_id,
                            "round_number": round_num,
                            "scores": score_data.get("scores"),
                            "feedback": score_data.get("feedback")
                        }).execute()
                    except Exception as e:
                        print(f"Error saving quality score: {e}")
                
                # 2. Moderator Speaks (Synthesis)
                mod_prompt = f"{context}\n\n[SYSTEM DIRECTIVE]: You are the Moderator. Synthesize the debate so far. Highlight key tensions. Provide concise guidance on what to focus on next. Be neutral but firm."
                yield f"event: agent_start\ndata: {json.dumps({'name': 'Moderator'})}\n\n"
                
                mod_content = ""
                try:
                    async for chunk in self.moderator.generate_stream(mod_prompt):
                         mod_content += chunk
                         yield f"event: token\ndata: {json.dumps({'text': chunk})}\n\n"
                except Exception as e:
                     mod_content = "Error generating synthesis."
                
                yield f"event: agent_end\ndata: {json.dumps({'name': 'Moderator'})}\n\n"
                
                # Save Moderator Response
                if self.db_service.get_client():
                    self.db_service.get_client().table("responses").insert({
                        "session_id": session_id,
                        "agent_name": "Moderator",
                        "content": mod_content
                    }).execute()
                    
                context += f"\n\nModerator: {mod_content}"
                # ---------------------------------------------

            
            # Delay to prevent rate limits
            await asyncio.sleep(2)

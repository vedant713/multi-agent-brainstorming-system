from typing import List, AsyncGenerator
import json
import asyncio
from agents.base import Agent
from agents.optimist import OptimistAgent
from agents.skeptic import SkepticAgent
from agents.analyst import AnalystAgent
from agents.evaluator import EvaluatorAgent
from agents.custom_agent import CustomAgent
from services.llm import LLMService
from services.database import DatabaseService

class Orchestrator:
    def __init__(self, llm_service: LLMService, db_service: DatabaseService):
        self.llm_service = llm_service
        self.db_service = db_service
        # No defaults init here strictly; we do it per session or init with defaults
        self.defaults = {
            "optimist": OptimistAgent("Optimist", "Optimist", llm_service),
            "skeptic": SkepticAgent("Skeptic", "Skeptic", llm_service),
            "analyst": AnalystAgent("Analyst", "Analyst", llm_service),
            "evaluator": EvaluatorAgent("Evaluator", "Evaluator", llm_service)
        }
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

    async def run_brainstorming_session(self, topic: str, session_id: str, agent_ids: List[str] = None) -> AsyncGenerator[str, None]:
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

        # 2. Reconstruct Context & Replay History
        context = f"Topic: {topic}"
        
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
            instruction = ""
            if round_num == 0:
                instruction = "Focus on generating a wide range of creative ideas."
            elif round_num == 1:
                instruction = "Critique the previous ideas. Identify potential flaws, risks, and missing perspectives."
            elif round_num == 2:
                instruction = "Address the critiques. Propose concrete, technical solutions and refinements."
            else:
                instruction = "Deepen the debate. Challenge the technical feasibility of proposed solutions. Discuss edge cases, scalability, and long-term implications. Do not be superficial."

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
            
            # Delay to prevent rate limits
            await asyncio.sleep(2)

from typing import List, AsyncGenerator
import json
from agents.base import Agent
from agents.optimist import OptimistAgent
from agents.skeptic import SkepticAgent
from agents.analyst import AnalystAgent
from agents.evaluator import EvaluatorAgent
from services.llm import LLMService
from services.database import DatabaseService

class Orchestrator:
    def __init__(self, llm_service: LLMService, db_service: DatabaseService):
        self.llm_service = llm_service
        self.db_service = db_service
        self.agents: List[Agent] = [
            OptimistAgent("Optimist", "Optimist", llm_service),
            SkepticAgent("Skeptic", "Skeptic", llm_service),
            AnalystAgent("Analyst", "Analyst", llm_service),
            EvaluatorAgent("Evaluator", "Evaluator", llm_service)
        ]

    async def run_brainstorming_session(self, topic: str, session_id: str) -> AsyncGenerator[str, None]:
        """
        Runs a brainstorming session.
        Yields SSE events.
        """
        import asyncio
        
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

        # 2. Reconstruct Context & Replay History
        context = f"Topic: {topic}"
        
        # We also need to map stored agent_name back to our agent instances if we wanted to be strict,
        # but for replay we just show the text.
        
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
                error_msg = "[Error generating response]"
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

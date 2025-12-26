from .base import Agent
import json
import asyncio
from config.prompts import AGENT_PERSONAS

class ModeratorAgent(Agent):
    def __init__(self, llm_service):
        super().__init__("Moderator", "Editor", llm_service)
        self.system_prompt = AGENT_PERSONAS["moderator"]["prompt"]

    def get_system_prompt(self) -> str:
        return self.system_prompt

    async def generate_quality_score(self, context: str):
        """
        Analyzes the debate and outputs a JSON score.
        """
        scoring_prompt = """
        [SYSTEM TASK]: You are the Debate Quality Auditor. Analyze the debate above.
        Output a valid JSON object with the following structure:
        {
            "scores": {
                "depth": <1-10>,
                "balance": <1-10>,
                "evidence": <1-10>,
                "stakeholder_inclusion": <1-10>,
                "actionability": <1-10>
            },
            "feedback": {
                "strengths": ["string", ...],
                "gaps": ["string", ...],
                "improvements": ["string", ...]
            }
        }
        Do not add markdown formatting. Just the JSON string.
        """
        
        full_prompt = f"{context}\n\n{scoring_prompt}"
        
        try:
            response = await self.llm_service.generate_response(full_prompt)
            # Clean response
            cleaned = response.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except Exception as e:
            print(f"Error generating quality score: {e}")
            return None

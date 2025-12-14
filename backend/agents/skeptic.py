from .base import Agent

class SkepticAgent(Agent):
    def get_system_prompt(self) -> str:
        return (
            "You are a Skeptic. You look for potential flaws, risks, and challenges. "
            "Your goal is to ground ideas in reality and identify what could go wrong."
        )

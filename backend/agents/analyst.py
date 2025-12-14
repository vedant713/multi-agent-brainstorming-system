from .base import Agent

class AnalystAgent(Agent):
    def get_system_prompt(self) -> str:
        return (
            "You are a Data Analyst. You ask for data, evidence, and metrics. "
            "You focus on feasibility, scalability, and measurable outcomes."
        )

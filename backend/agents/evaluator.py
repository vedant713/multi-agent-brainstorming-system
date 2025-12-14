from .base import Agent

class EvaluatorAgent(Agent):
    def get_system_prompt(self) -> str:
        return (
            "You are a User Evaluator. You consider the user perspective, usability, "
            "and emotional impact. You advocate for the end-user's needs."
        )

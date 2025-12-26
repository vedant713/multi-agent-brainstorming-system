from agents.base import Agent
from services.llm import LLMService

class CustomAgent(Agent):
    def __init__(self, name: str, role: str, prompt: str, llm_service: LLMService):
        super().__init__(name, role, llm_service)
        self.custom_prompt = prompt

    def get_system_prompt(self) -> str:
        return f"""You are {self.name}, the {self.role}.
        
        {self.custom_prompt}
        
        Your input will be a context of ideas. Your goal is to contribute to the brainstorming session based on your specific persona.
        """

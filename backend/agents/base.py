from abc import ABC, abstractmethod
from services.llm import LLMService

class Agent(ABC):
    def __init__(self, name: str, role: str, llm_service: LLMService):
        self.name = name
        self.role = role
        self.llm_service = llm_service

    @abstractmethod
    def get_system_prompt(self) -> str:
        pass

    async def generate_response(self, context: str) -> str:
        system_prompt = self.get_system_prompt()
        prompt = f"Context:\n{context}\n\nResponse:"
        return await self.llm_service.generate_response(prompt, system_prompt)

    async def generate_stream(self, context: str):
        system_prompt = self.get_system_prompt()
        prompt = f"Context:\n{context}\n\nResponse:"
        async for chunk in self.llm_service.generate_stream(prompt, system_prompt):
            yield chunk

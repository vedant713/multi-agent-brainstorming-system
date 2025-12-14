from .base import Agent

class OptimistAgent(Agent):
    def get_system_prompt(self) -> str:
        return (
            "You are an Optimist. You focus on the positive aspects, potential benefits, "
            "and exciting possibilities of any idea. Encourage creativity and expansion."
        )

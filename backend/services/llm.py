import os
from typing import AsyncGenerator
import json
import asyncio
import google.generativeai as genai
import ollama

class LLMService:
    LOCAL_MODEL = "gemma3:27b"

    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY") or os.getenv("GOOGLE_API_KEY")
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
            print("Warning: LLM_API_KEY or GOOGLE_API_KEY not found. Will default to local model if available or mock.")

    async def _generate_ollama(self, prompt: str, system_prompt: str = None) -> str:
        """Fallback to local Ollama model."""
        try:
            print(f"Fallback: Using local model {self.LOCAL_MODEL}")
            messages = []
            if system_prompt:
                messages.append({'role': 'system', 'content': system_prompt})
            messages.append({'role': 'user', 'content': prompt})
            
            response = ollama.chat(model=self.LOCAL_MODEL, messages=messages)
            return response['message']['content']
        except Exception as e:
            print(f"Ollama Error: {e}")
            return f"Error using local fallback: {e}"

    async def _stream_ollama(self, prompt: str, system_prompt: str = None) -> AsyncGenerator[str, None]:
        """Fallback to local Ollama stream."""
        try:
            print(f"Fallback Stream: Using local model {self.LOCAL_MODEL}")
            messages = []
            if system_prompt:
                messages.append({'role': 'system', 'content': system_prompt})
            messages.append({'role': 'user', 'content': prompt})
            
            stream = ollama.chat(model=self.LOCAL_MODEL, messages=messages, stream=True)
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    yield chunk['message']['content']
        except Exception as e:
            print(f"Ollama Stream Error: {e}")
            yield f"Error using local stream fallback: {e}"

    async def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        """
        Generates a response from the LLM.
        """
        if not self.model:
            return await self._generate_ollama(prompt, system_prompt)
        
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"

        try:
            # Gemini async generation is not fully standard in all versions, 
            # but we can use the sync version in a thread or just await if supported.
            # For simplicity and safety with 'google-generativeai', we use generate_content_async
            response = await self.model.generate_content_async(full_prompt)
            return response.text
        except Exception as e:
            print(f"Gemini Error: {e}. Switching to local fallback.")
            return await self._generate_ollama(prompt, system_prompt)

    async def generate_stream(self, prompt: str, system_prompt: str = None) -> AsyncGenerator[str, None]:
        """
        Generates a streaming response.
        """
        if not self.model:
             async for chunk in self._stream_ollama(prompt, system_prompt):
                 yield chunk
             return

        full_prompt = prompt
        if system_prompt:
            full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"

        try:
            response = await self.model.generate_content_async(full_prompt, stream=True)
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Gemini Stream Error: {e}. Switching to local fallback.")
            async for chunk in self._stream_ollama(prompt, system_prompt):
                yield chunk

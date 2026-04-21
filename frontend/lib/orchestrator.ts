import { generateStream, generateResponse } from "./openrouter";
import { AgentInstance, DEFAULT_AGENTS, createAgentInstance } from "./agents";

export interface SessionMessage {
  id: string;
  agentName: string;
  content: string;
}

export class Orchestrator {
  private messages: Map<string, SessionMessage[]> = new Map();
  private agents: AgentInstance[] = DEFAULT_AGENTS.map(createAgentInstance);

  getMessages(sessionId: string): SessionMessage[] {
    return this.messages.get(sessionId) || [];
  }

  setAgents(agentIds: string[]) {
    const selectedAgents: AgentInstance[] = [];
    for (const id of agentIds) {
      const agent = DEFAULT_AGENTS.find((a) => a.id === id);
      if (agent) {
        selectedAgents.push(createAgentInstance(agent));
      }
    }
    this.agents = selectedAgents.length > 0 ? selectedAgents : DEFAULT_AGENTS.map(createAgentInstance);
  }

  async *runSession(sessionId: string, topic: string, agentIds?: string[]): AsyncGenerator<string> {
    if (agentIds) {
      this.setAgents(agentIds);
    }

    const history = this.getMessages(sessionId);
    let context = `Topic: ${topic}`;

    for (const record of history) {
      yield `event: agent_start\ndata: ${JSON.stringify({ name: record.agentName })}\n\n`;
      yield `event: token\ndata: ${JSON.stringify({ text: record.content })}\n\n`;
      yield `event: agent_end\ndata: ${JSON.stringify({ name: record.agentName })}\n\n`;
      context += `\n\n${record.agentName}: ${record.content}`;
    }

    const totalResponses = history.length;

    while (true) {
      if (this.agents.length === 0) {
        yield `event: token\ndata: ${JSON.stringify({ text: "System Error: No agents selected for this session." })}\n\n`;
        break;
      }

      const agentIndex = totalResponses % this.agents.length;
      const agent = this.agents[agentIndex];
      const roundNum = Math.floor(totalResponses / this.agents.length);

      let instruction = "";
      if (roundNum === 0) {
        instruction = "Focus on generating a wide range of creative ideas.";
      } else if (roundNum === 1) {
        instruction = "Critique the previous ideas. Identify potential flaws, risks, and missing perspectives.";
      } else if (roundNum === 2) {
        instruction = "Address the critiques. Propose concrete, technical solutions and refinements.";
      } else {
        instruction = "Deepen the debate. Challenge the technical feasibility of proposed solutions. Discuss edge cases, scalability, and long-term implications. Do not be superficial.";
      }

      const concisenessInstruction = " Keep your response concise, on-point, and balanced. Use simple, plain English that is easy to read. Avoid jargon, complex sentence structures, and heavy academic language. Ensure the core idea is clearly explained without overcomplicating it.";
      const effectiveContext = `${context}\n\n[SYSTEM DIRECTIVE]: ${instruction}${concisenessInstruction}`;

      yield `event: agent_start\ndata: ${JSON.stringify({ name: agent.name })}\n\n`;

      let responseContent = "";
      try {
        for await (const chunk of generateStream(effectiveContext, agent.getSystemPrompt())) {
          responseContent += chunk;
          yield `event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`;
        }
      } catch (e) {
        const errorMsg = `[Error: ${e instanceof Error ? e.message : "Unknown error"}]`;
        responseContent = errorMsg;
        yield `event: token\ndata: ${JSON.stringify({ text: errorMsg })}\n\n`;
      }

      yield `event: agent_end\ndata: ${JSON.stringify({ name: agent.name })}\n\n`;

      const message: SessionMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentName: agent.name,
        content: responseContent,
      };

      const sessionMessages = this.messages.get(sessionId) || [];
      sessionMessages.push(message);
      this.messages.set(sessionId, sessionMessages);

      context += `\n\n${agent.name}: ${responseContent}`;

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

export const orchestrator = new Orchestrator();

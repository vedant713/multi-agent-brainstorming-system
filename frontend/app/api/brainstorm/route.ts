import { NextRequest, NextResponse } from "next/server";

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  prompt: string;
}

export interface SessionConfig {
  topic: string;
  agents: AgentConfig[];
}

export const sessionStore: Map<string, SessionConfig> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const topic = body.topic as string;
    const agents = body.agents as AgentConfig[];

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ error: "At least one agent is required" }, { status: 400 });
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    sessionStore.set(sessionId, { topic, agents });

    return NextResponse.json({ session_id: sessionId });
  } catch (error) {
    console.error("Brainstorm error:", error);
    return NextResponse.json(
      { error: "Failed to start brainstorming session" },
      { status: 500 }
    );
  }
}

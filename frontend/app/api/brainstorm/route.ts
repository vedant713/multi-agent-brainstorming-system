import { NextRequest, NextResponse } from "next/server";
import { orchestrator } from "@/lib/orchestrator";

export interface SessionConfig {
  topic: string;
  agentIds: string[];
}

export const sessionStore: Map<string, SessionConfig> = new Map();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const topic = formData.get("topic") as string;
    const agentIdsStr = formData.get("agent_ids") as string | null;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agentIds = agentIdsStr ? agentIdsStr.split(",") : ["optimist", "skeptic", "analyst", "evaluator"];

    sessionStore.set(sessionId, { topic, agentIds });

    return NextResponse.json({ session_id: sessionId });
  } catch (error) {
    console.error("Brainstorm error:", error);
    return NextResponse.json(
      { error: "Failed to start brainstorming session" },
      { status: 500 }
    );
  }
}

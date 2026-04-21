import { NextRequest } from "next/server";
import { orchestrator } from "@/lib/orchestrator";
import { sessionStore, AgentConfig } from "../../route";

function parseAgentsFromParam(param: string | null): AgentConfig[] | undefined {
  if (!param) return undefined;
  try {
    const decoded = decodeURIComponent(param);
    const agents = JSON.parse(decoded) as AgentConfig[];
    if (Array.isArray(agents) && agents.length > 0) {
      return agents;
    }
  } catch (e) {
    console.error("Failed to parse agents from param:", e);
  }
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const topic = searchParams.get("topic") || "Unknown Topic";
  const agentsParam = searchParams.get("agents");

  let agents: AgentConfig[] | undefined;

  if (agentsParam) {
    agents = parseAgentsFromParam(agentsParam);
  }

  if (!agents) {
    const config = sessionStore.get(sessionId);
    if (config?.agents) {
      agents = config.agents;
    }
  }

  if (agents) {
    orchestrator.setAgentConfigs(agents);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of orchestrator.runSession(sessionId, topic, agents)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error("Stream error:", error);
        const errorMsg = `event: token\ndata: ${JSON.stringify({ text: "Error: " + (error instanceof Error ? error.message : "Unknown error") })}\n\n`;
        controller.enqueue(encoder.encode(errorMsg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
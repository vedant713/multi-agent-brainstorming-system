import { NextRequest } from "next/server";
import { orchestrator } from "@/lib/orchestrator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const topic = searchParams.get("topic") || "Unknown Topic";
  const agentIdsParam = searchParams.get("agent_ids");
  const agentIds = agentIdsParam ? agentIdsParam.split(",") : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of orchestrator.runSession(sessionId, topic, agentIds)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error("Stream error:", error);
        const errorMsg = `event: token\ndata: ${JSON.stringify({ text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` })}\n\n`;
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

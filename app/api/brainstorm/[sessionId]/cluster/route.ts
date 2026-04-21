import { NextRequest, NextResponse } from "next/server";
import { orchestrator } from "@/lib/orchestrator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const messages = orchestrator.getMessages(sessionId);

    if (messages.length === 0) {
      return NextResponse.json({ clusters: [] });
    }

    const texts = messages.map((m) => m.content);
    const clusters = generateMockClusters(texts, messages);

    return NextResponse.json({ clusters });
  } catch (error) {
    console.error("Clustering error:", error);
    return NextResponse.json(
      { error: "Failed to cluster responses" },
      { status: 500 }
    );
  }
}

function generateMockClusters(texts: string[], messages: { id: string; agentName: string; content: string }[]) {
  const numClusters = Math.min(Math.max(2, Math.floor(texts.length / 2)), 5);
  const clusterSize = Math.ceil(texts.length / numClusters);
  
  const clusters = [];
  for (let i = 0; i < numClusters; i++) {
    const start = i * clusterSize;
    const end = Math.min(start + clusterSize, texts.length);
    const clusterTexts = texts.slice(start, end);
    const clusterMessages = messages.slice(start, end);

    if (clusterTexts.length === 0) continue;

    const combinedText = clusterTexts.join(" ");
    const wordCount = combinedText.split(/\s+/).length;
    const uniqueWords = new Set(combinedText.toLowerCase().split(/\s+/));
    
    let name = `Cluster ${i + 1}`;
    let description = `${clusterTexts.length} related ideas`;

    if (uniqueWords.size > 0) {
      const topWords = Array.from(uniqueWords)
        .filter(w => w.length > 4)
        .slice(0, 3);
      
      if (topWords.length > 0) {
        name = topWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" & ");
      }
    }

    if (wordCount < 50) {
      description = "Brief initial observations";
    } else if (wordCount < 150) {
      description = "Developed perspectives and insights";
    } else {
      description = "In-depth analysis and discussion";
    }

    clusters.push({
      id: `cluster-${i + 1}`,
      name,
      description,
      response_ids: clusterMessages.map((m) => m.id),
    });
  }

  return clusters;
}

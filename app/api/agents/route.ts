import { NextResponse } from "next/server";

const customAgents: { id: string; name: string; role: string; prompt: string }[] = [];

export async function GET() {
  return NextResponse.json({ agents: customAgents });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, role, prompt } = body;

    if (!name || !role || !prompt) {
      return NextResponse.json(
        { error: "Name, role, and prompt are required" },
        { status: 400 }
      );
    }

    const newAgent = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      role,
      prompt,
    };

    customAgents.push(newAgent);

    return NextResponse.json({ message: "Agent created", data: [newAgent] });
  } catch (error) {
    console.error("Create agent error:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();

    const index = customAgents.findIndex((a) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    customAgents.splice(index, 1);
    return NextResponse.json({ message: "Agent deleted", data: [] });
  } catch (error) {
    console.error("Delete agent error:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { AGENT_PRESETS } from "@/lib/agents";

export async function GET() {
  return NextResponse.json({ presets: AGENT_PRESETS });
}

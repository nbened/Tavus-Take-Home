import { NextResponse } from "next/server";
import { broadcast } from "@/lib/sse";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const name: string = body?.tool_call?.name ?? body?.name;
  const params: Record<string, unknown> = body?.tool_call?.parameters ?? body?.parameters ?? {};

  if (name === "switch_tab") {
    const tab = params?.tab;
    if (tab === "code" || tab === "markdown" || tab === "preview") {
      broadcast("switch_tab", { tab });
    }
  }

  return NextResponse.json({ result: "ok" });
}

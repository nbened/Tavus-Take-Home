import { NextResponse } from "next/server";

const TAVUS_API = "https://tavusapi.com";

async function tavus(path: string, method: string, body?: unknown) {
  return fetch(`${TAVUS_API}${path}`, {
    method,
    headers: {
      "x-api-key": process.env.API_KEY_TAVUS!,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export async function POST(request: Request) {
  if (!process.env.API_KEY_TAVUS) {
    return NextResponse.json({ error: "Tavus API key not configured" }, { status: 500 });
  }

  const { system_prompt } = await request.json().catch(() => ({}));
  const replicaId = process.env.TAVUS_REPLICA_ID ?? "rdd4c86e5e1a";

  // Create a temporary persona if a custom prompt was provided
  let personaId = process.env.TAVUS_PERSONA_ID ?? "pdac61133ac5";
  let tempPersonaId: string | null = null;

  if (system_prompt?.trim()) {
    const pRes = await tavus("/v2/personas", "POST", {
      persona_name: `temp-${Date.now()}`,
      system_prompt: system_prompt.trim(),
      default_replica_id: replicaId,
      pipeline_mode: "full",
    });
    if (pRes.ok) {
      const p = await pRes.json();
      personaId = p.persona_id;
      tempPersonaId = p.persona_id;
    }
  }

  const convRes = await tavus("/v2/conversations", "POST", {
    replica_id: replicaId,
    persona_id: personaId,
    conversation_name: "Agent Session",
    properties: { max_call_duration: 3600, enable_recording: false },
  });

  if (!convRes.ok) {
    if (tempPersonaId) await tavus(`/v2/personas/${tempPersonaId}`, "DELETE");
    const error = await convRes.text();
    return NextResponse.json({ error }, { status: convRes.status });
  }

  const data = await convRes.json();
  return NextResponse.json({
    conversation_url: data.conversation_url,
    conversation_id: data.conversation_id,
    temp_persona_id: tempPersonaId,
  });
}

export async function DELETE(request: Request) {
  if (!process.env.API_KEY_TAVUS) {
    return NextResponse.json({ error: "Tavus API key not configured" }, { status: 400 });
  }

  const { conversation_id, temp_persona_id } = await request.json();

  if (conversation_id) {
    await tavus(`/v2/conversations/${conversation_id}/end`, "POST");
  }
  if (temp_persona_id) {
    await tavus(`/v2/personas/${temp_persona_id}`, "DELETE");
  }

  return NextResponse.json({ success: true });
}

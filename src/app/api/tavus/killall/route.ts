import { NextResponse } from "next/server";

const TAVUS_API = "https://tavusapi.com";

async function tavus(path: string, method: string) {
  return fetch(`${TAVUS_API}${path}`, {
    method,
    headers: { "x-api-key": process.env.API_KEY_TAVUS! },
  });
}

export async function POST() {
  const res = await tavus("/v2/conversations?status=active", "GET");
  if (!res.ok) return NextResponse.json({ error: "Failed to list conversations" }, { status: 500 });

  const { data } = await res.json();
  await Promise.all((data ?? []).map((c: { conversation_id: string }) =>
    tavus(`/v2/conversations/${c.conversation_id}/end`, "POST")
  ));

  return NextResponse.json({ ended: data?.length ?? 0 });
}

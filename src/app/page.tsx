"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const LS_KEY = "editor_html";

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #fafafa;
      color: #111;
      gap: 1rem;
      padding: 2rem;
      text-align: center;
    }
    .badge { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: #999; font-weight: 500; }
    h1 { font-size: 2.5rem; font-weight: 700; }
    p { color: #666; max-width: 420px; line-height: 1.65; }
  </style>
</head>
<body>
  <span class="badge">Onboarding</span>
  <h1>Welcome to the team, Jack 👋</h1>
  <p>We're glad to have you here. Explore the docs, set up your environment, and don't hesitate to reach out if you need anything.</p>
</body>
</html>`;

type CallState = "idle" | "loading" | "active" | "ended";

const BUG_REPORT_PROMPT = `You are an on-call engineer named John. A new team member is reporting a bug to you. Start every conversation by greeting them and asking what bug they'd like to report. Be helpful, empathetic, and guide them through describing the issue clearly.`;

export default function Home() {
  const onboardingRef = useRef<HTMLDivElement>(null);

  // Read from localStorage synchronously before first paint (client-only)
  const [pageHtml, setPageHtml] = useState<string>(FALLBACK_HTML);
  useLayoutEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setPageHtml(saved);
  }, []);

  // Listen for real-time updates from the agent editor in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) setPageHtml(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function scrollToOnboarding() {
    onboardingRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Agent state
  const [callState, setCallState] = useState<CallState>("idle");
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tempPersonaId, setTempPersonaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCall() {
    setCallState("loading");
    setError(null);
    const res = await fetch("/api/tavus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_prompt: BUG_REPORT_PROMPT }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to start conversation");
      setCallState("idle");
      return;
    }
    setConversationUrl(data.conversation_url);
    setConversationId(data.conversation_id);
    setTempPersonaId(data.temp_persona_id ?? null);
    setCallState("active");
  }

  async function endCall() {
    await fetch("/api/tavus", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, temp_persona_id: tempPersonaId }),
    });
    setCallState("ended");
    setConversationUrl(null);
    setConversationId(null);
    setTempPersonaId(null);
  }

  return (
    <div className="overflow-y-scroll h-[calc(100vh-57px)] snap-y snap-mandatory">

      {/* ── Section 1: Hero ── */}
      <section className="snap-start h-[calc(100vh-57px)] flex flex-col items-center justify-center gap-6 bg-white px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight max-w-lg">
          You&apos;ve just been hired on as the newest member of{" "}
          <span className="text-blue-600">Joja Mart</span>
        </h1>
        <p className="text-neutral-500 text-sm max-w-sm">
          Joja Mart is a global corporation renown for getting their new employee&apos;s names right
        </p>
        <button
          onClick={scrollToOnboarding}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
        >
          Start demo ↓
        </button>
      </section>

      {/* ── Section 2: Onboarding — live from the agent editor ── */}
      <section
        ref={onboardingRef}
        className="snap-start h-[calc(100vh-57px)] relative overflow-hidden"
      >
        {/* Live iframe — renders whatever HTML is in the editor */}
        <iframe
          className="w-full h-full border-0"
          srcDoc={pageHtml}
          sandbox="allow-scripts"
          title="Onboarding page"
        />

        {/* Floating "Report a bug" / call UI */}
        <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-10">
          {callState === "idle" && (
            <>
              <button
                onClick={startCall}
                className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg"
              >
                Report a bug
              </button>
              {error && (
                <p className="text-red-500 text-xs bg-white rounded px-2 py-1 shadow">{error}</p>
              )}
            </>
          )}

          {callState === "loading" && (
            <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 shadow-lg">
              <div className="w-4 h-4 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
              <span className="text-sm text-neutral-500">Connecting…</span>
            </div>
          )}

          {callState === "active" && conversationUrl && (
            <div className="flex flex-col items-end gap-2 w-80">
              <div className="w-full rounded-xl overflow-hidden border border-neutral-200 shadow-xl bg-black aspect-video">
                <iframe
                  src={conversationUrl}
                  allow="camera *; microphone *; autoplay *; display-capture *; speaker *; fullscreen *; clipboard-write *"
                  className="w-full h-full"
                  title="Bug Report Agent"
                />
              </div>
              <button
                onClick={endCall}
                className="px-3 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded-md hover:bg-neutral-700 transition-colors shadow"
              >
                End call
              </button>
            </div>
          )}

          {callState === "ended" && (
            <div className="flex flex-col items-end gap-2 bg-white rounded-lg px-4 py-3 shadow-lg">
              <p className="text-neutral-500 text-sm">Thanks for the report!</p>
              <button
                onClick={() => setCallState("idle")}
                className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-md hover:bg-neutral-800 transition-colors"
              >
                Report another
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

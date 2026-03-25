"use client";

import { useState } from "react";

const DEFAULT_PROMPT = `You are John, an on-call engineer. Start every conversation by greeting the user with "What's up, I'm John, the on-call engineer." Then be helpful, direct, and conversational.`;

type CallState = "idle" | "loading" | "active" | "ended";

export default function AgentPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tempPersonaId, setTempPersonaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);

  async function startCall() {
    setCallState("loading");
    setError(null);

    const res = await fetch("/api/tavus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_prompt: prompt }),
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
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] gap-6 px-4 py-8">
      {callState === "idle" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">AI Video Agent</h1>
            <p className="text-neutral-400 text-sm">Start a live video conversation.</p>
          </div>

          <button
            onClick={startCall}
            className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
          >
            Join Call
          </button>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Prompt toggle */}
          <div className="w-full border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setPromptOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <span className="font-medium">System prompt</span>
              <svg
                className={`w-4 h-4 transition-transform ${promptOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {promptOpen && (
              <div className="border-t border-neutral-200 p-3 flex flex-col gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="w-full text-sm font-mono text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md p-3 resize-y focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  onClick={() => setPrompt(DEFAULT_PROMPT)}
                  className="self-end text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Reset to default
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {callState === "loading" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">Connecting…</p>
        </div>
      )}

      {callState === "active" && conversationUrl && (
        <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
          <div className="w-full rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-black aspect-video">
            <iframe
              src={conversationUrl}
              allow="camera; microphone; autoplay; display-capture"
              className="w-full h-full"
              title="Tavus Agent"
            />
          </div>

          <button
            onClick={endCall}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            End Call
          </button>

          {/* Prompt viewer */}
          <div className="w-full border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setPromptOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <span className="font-medium">System prompt</span>
              <svg
                className={`w-4 h-4 transition-transform ${promptOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {promptOpen && (
              <div className="border-t border-neutral-200 p-3">
                <p className="text-xs text-neutral-400 mb-2">Changes take effect on the next call.</p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="w-full text-sm font-mono text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md p-3 resize-y focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {callState === "ended" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-neutral-500 text-sm">Call ended.</p>
          <button
            onClick={() => setCallState("idle")}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
          >
            Start New Call
          </button>
        </div>
      )}
    </main>
  );
}

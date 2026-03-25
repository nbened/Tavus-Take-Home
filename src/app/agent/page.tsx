"use client";

import { useEffect, useState } from "react";
import { DEFAULT_HTML } from "@/lib/defaultHtml";

const LS_KEY = "editor_html";

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(md: string): string {
  const html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, "<ul>$1</ul>")
    .replace(/^(?!<[hupbl])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family: system-ui, sans-serif; max-width: 680px; margin: 2rem auto; padding: 0 1rem; color: #111; line-height: 1.6; }
    h1,h2,h3 { font-weight: 600; margin-top: 1.5rem; }
    code { background: #f0f0f0; padding: .15em .35em; border-radius: 4px; font-size: .9em; }
    pre { background: #f0f0f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 1rem; color: #555; }
    ul { padding-left: 1.5rem; }
  </style></head><body>${html}</body></html>`;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROMPT = `You are John, an on-call engineer. Start every conversation by greeting the user with "What's up, I'm John, the on-call engineer." Then be helpful, direct, and conversational.`;


const DEFAULT_MD = `# My Document

## Introduction

Write **bold**, _italic_, or \`inline code\` here.

## List

- Item one
- Item two
- Item three

> Blockquotes work too.
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type CallState = "idle" | "loading" | "active" | "ended";
type EditorTab = "code" | "markdown" | "preview";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentPage() {
  // Zoom splash
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    startCall();
    const timer = setTimeout(() => setSplash(false), 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Agent state
  const [callState, setCallState] = useState<CallState>("idle");
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tempPersonaId, setTempPersonaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);
  const [hangingUp, setHangingUp] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);

  // Editor state
  const [tab, setTab] = useState<EditorTab>("code");
  const [html, setHtml] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LS_KEY) ?? DEFAULT_HTML;
    }
    return DEFAULT_HTML;
  });
  const [md, setMd] = useState(DEFAULT_MD);

  // Persist html to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, html);
  }, [html]);

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

  const editorTabs: { id: EditorTab; label: string }[] = [
    { id: "code", label: "Code" },
    { id: "markdown", label: "Markdown" },
    { id: "preview", label: "Preview" },
  ];

  if (splash) {
    return (
      <div className="flex h-[calc(100vh-57px)] w-full items-center justify-center bg-[#f7f7f7] select-none">
        <div className="flex flex-col items-center gap-5">
          {/* Zoom camera icon */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="72" height="72" rx="16" fill="#2D8CFF"/>
            <path d="M14 26a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V26z" fill="white"/>
            <path d="M46 30.5l12-7v25l-12-7V30.5z" fill="white"/>
          </svg>

          {/* Wordmark */}
          <span className="text-5xl font-bold tracking-tight text-[#2D8CFF]" style={{ fontFamily: "system-ui, sans-serif" }}>zoom</span>

          {/* Loading dots */}
          <div className="flex items-center gap-1.5 mt-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-2 h-2 rounded-full bg-[#2D8CFF]"
                style={{ animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>

          {/* Status */}
          <p className="text-[#555] text-sm tracking-wide">Waking up engineer on call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] w-full overflow-hidden">

      {/* ── Left: Agent ── */}
      <div className="w-1/2 flex flex-col border-r border-neutral-200 overflow-hidden">

        {/* Main content — fills all available height */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {callState === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              <h1 className="text-2xl font-semibold tracking-tight">AI Video Agent</h1>
              <p className="text-neutral-400 text-sm">Start a live video conversation.</p>
              <button
                onClick={startCall}
                className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
              >
                Join Call
              </button>
              {error && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-red-500 text-sm">{error}</p>
                  {error.includes("maximum concurrent") && (
                    <button
                      disabled={killing}
                      onClick={async () => {
                        setKilling(true);
                        await fetch("/api/tavus/killall", { method: "POST" });
                        setKilling(false);
                        setError(null);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {killing && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                      {killing ? "Killing sessions…" : "Kill active sessions"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {callState === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
              <p className="text-neutral-400 text-sm">Connecting…</p>
            </div>
          )}

          {callState === "active" && conversationUrl && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 relative overflow-hidden flex flex-col">
              <iframe
                src={conversationUrl}
                allow="camera *; microphone *; autoplay *; display-capture *; speaker *; fullscreen *; clipboard-write *"
                className="flex-1 w-full border-0"
                title="Tavus Agent"
              />
              </div>
              <div className="flex justify-center items-center py-3 shrink-0 border-t border-neutral-200">
                <button
                  disabled={hangingUp}
                  onClick={async () => {
                    setHangingUp(true);
                    await endCall();
                    sessionStorage.setItem("scrollToOnboarding", "1");
                    window.location.href = "/?isRetry=true";
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {hangingUp && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Hang up and test changes
                </button>
              </div>
            </div>
          )}

          {callState === "ended" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-neutral-500 text-sm">Call ended.</p>
              <button
                onClick={() => setCallState("idle")}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
              >
                Start New Call
              </button>
            </div>
          )}
        </div>

        {/* System prompt — pinned to bottom */}
        <div className="shrink-0 border-t border-neutral-200">
          <button
            onClick={() => setPromptOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <span className="font-medium">System prompt</span>
            <svg className={`w-4 h-4 transition-transform ${promptOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {promptOpen && (
            <div className="border-t border-neutral-200 p-3 flex flex-col gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="w-full text-sm font-mono text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button onClick={() => setPrompt(DEFAULT_PROMPT)} className="self-end text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                Reset to default
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Editor ── */}
      <div className="w-1/2 flex flex-col bg-neutral-950 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-neutral-800 px-3 pt-2 shrink-0">
          {editorTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                tab === id
                  ? "bg-neutral-900 text-white border border-b-0 border-neutral-700"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto pb-2">
            {tab === "code" && (
              <button onClick={() => setHtml(DEFAULT_HTML)} className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Reset</button>
            )}
            {tab === "markdown" && (
              <button onClick={() => setMd(DEFAULT_MD)} className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Reset</button>
            )}
          </div>
        </div>

        {/* Code tab */}
        {tab === "code" && (
          <textarea
            className="flex-1 w-full bg-neutral-950 text-neutral-100 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        )}

        {/* Markdown tab */}
        {tab === "markdown" && (
          <div className="flex flex-1 overflow-hidden">
            <textarea
              className="flex-1 bg-neutral-950 text-neutral-100 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed border-r border-neutral-800"
              value={md}
              onChange={(e) => setMd(e.target.value)}
              spellCheck={false}
            />
            <iframe
              className="flex-1 bg-white"
              srcDoc={renderMarkdown(md)}
              sandbox="allow-scripts"
              title="Markdown preview"
            />
          </div>
        )}

        {/* Preview tab */}
        {tab === "preview" && (
          <iframe
            className="flex-1 w-full bg-white"
            srcDoc={html}
            sandbox="allow-scripts"
            title="HTML preview"
          />
        )}
      </div>
    </div>
  );
}

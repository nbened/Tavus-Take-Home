"use client";

import { useEffect, useState } from "react";

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

const DEFAULT_HTML = `<!DOCTYPE html>
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
    .badge {
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #999;
      font-weight: 500;
    }
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
  // Agent state
  const [callState, setCallState] = useState<CallState>("idle");
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tempPersonaId, setTempPersonaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="flex h-[calc(100vh-57px)] w-full overflow-hidden">

      {/* ── Left: Agent ── */}
      <div className="w-1/2 flex flex-col items-center justify-center gap-6 px-8 py-8 border-r border-neutral-200 overflow-y-auto">

        {callState === "idle" && (
          <div className="flex flex-col items-center gap-4 w-full max-w-lg">
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
            <div className="w-full border border-neutral-200 rounded-lg overflow-hidden">
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
                    rows={6}
                    className="w-full text-sm font-mono text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-md p-3 resize-y focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <button onClick={() => setPrompt(DEFAULT_PROMPT)} className="self-end text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
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
          <div className="flex flex-col items-center gap-4 w-full max-w-lg">
            <div className="w-full rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-black aspect-video">
              <iframe
                src={conversationUrl}
                allow="camera *; microphone *; autoplay *; display-capture *; speaker *; fullscreen *; clipboard-write *"
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
            <div className="w-full border border-neutral-200 rounded-lg overflow-hidden">
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

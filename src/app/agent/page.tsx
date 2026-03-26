"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { DEFAULT_HTML } from "@/lib/defaultHtml";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("html", xml);

const LS_KEY = "editor_html";

// ─── Defaults ─────────────────────────────────────────────────────────────────

function buildPrompt(code: string): string {
  return `You are John, on-call engineer at Joja Mart.
Your personality: Upbeat, helpful, genuinely amused this keeps happening. Like a senior engineer who actually likes showing the new person around.
The situation: Joja Mart is famous for never getting a new employee's name wrong. They've gotten it wrong every single time. You find this funny more than frustrating.
The code you're both looking at:
\`\`\`html
${code}
\`\`\`
Tutorial flow — wait for the user at each step before moving on:
Step 1 — Find the bad line
Introduce yourself warmly. Mention this name thing happens constantly with this exact line — "you'd think statistically we'd have guess someone's name right by now." Tell them the good news: they get to write their first line of code for the company today. Ask them to open the editor and hit Ctrl+F and search for "Welcome to Joja Mart" to find the bad line. Wait for them to confirm they found it.
Step 2 — Change the name
Tell them to replace the wrong name with their actual name right there in the code. Wait for them to confirm they've done it.
Step 3 — Save and celebrate
Tell them it saves automatically. The page will update. They just shipped their first fix to the Joja Mart codebase. Be genuinely proud. Encourage them to hang up and check it out.
Important: Only mention your name being listed as Harold if the user brings it up first. If they do, laugh it off — "yeah, they get that wrong too."`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CallState = "idle" | "loading" | "active" | "ended";

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);

  // Editor state
  const [html, setHtml] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LS_KEY) ?? DEFAULT_HTML;
    }
    return DEFAULT_HTML;
  });

  // Persist html to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, html);
  }, [html]);

  // Syntax highlighting
  const highlighted = useMemo(
    () => hljs.highlight(html, { language: "html" }).value,
    [html]
  );

  // Textarea / pre scroll sync
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  function syncScroll() {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  async function startCall() {
    setCallState("loading");
    setError(null);
    const currentHtml = localStorage.getItem(LS_KEY) ?? DEFAULT_HTML;
    const res = await fetch("/api/tavus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_prompt: buildPrompt(currentHtml) }),
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
          <span className="text-5xl font-bold tracking-tight text-[#2D8CFF]" style={{ fontFamily: "system-ui, sans-serif" }}>zoom</span>
          <div className="flex items-center gap-1.5 mt-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-2 h-2 rounded-full bg-[#2D8CFF]"
                style={{ animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
          <p className="text-[#555] text-sm tracking-wide">Waking up the engineer on call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] w-full overflow-hidden">

      {/* ── Left: Agent ── */}
      <div className="w-1/2 flex flex-col border-r border-neutral-200 overflow-hidden">

        {/* Main content */}
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
              <div className="flex-1 relative overflow-hidden">
                <iframe
                  src={conversationUrl}
                  allow="camera *; microphone *; autoplay *; display-capture *; speaker *; fullscreen *; clipboard-write *"
                  className="absolute inset-0 w-full h-full border-0"
                  title="Tavus Agent"
                />
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

      </div>

      {/* ── Right: Code Editor ── */}
      <div className="w-1/2 flex flex-col bg-[#282c34] overflow-hidden">

        {!editorOpen && (
          <div className="flex-1 flex items-center justify-center">
            <button
              disabled={callState !== "active"}
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-neutral-700 text-white text-sm font-medium rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Open editor
            </button>
          </div>
        )}

        {editorOpen && <>

        {/* Browser chrome */}
        <div className="shrink-0 bg-neutral-800 border-b border-neutral-700 px-3 py-2.5">
          <div className="flex items-center gap-3">
            {/* Window control dots */}
            <div className="flex items-center gap-1.5 group">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] flex items-center justify-center cursor-pointer" onClick={() => setEditorOpen(false)}>
                <svg className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 6 6" fill="none" stroke="#7a0000" strokeWidth="1.5">
                  <path d="M1 1l4 4M5 1L1 5" />
                </svg>
              </div>
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            {/* URL bar */}
            <div className="flex-1 flex justify-center">
              <div className="bg-neutral-700/70 rounded-md px-4 py-0.5 text-xs text-neutral-400 font-mono w-48 text-center select-none">
                index.html
              </div>
            </div>
            {/* Reset + Hang Up button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHtml(DEFAULT_HTML)}
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                Reset
              </button>
              <button
                disabled={hangingUp || callState !== "active" || !hasEdited}
                onClick={async () => {
                  setHangingUp(true);
                  await endCall();
                  sessionStorage.setItem("scrollToOnboarding", "1");
                  window.location.href = "/?isRetry=true";
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-white text-xs font-medium rounded-md transition-all disabled:cursor-not-allowed ${
                  hasEdited && callState === "active"
                    ? "bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/40"
                    : "bg-neutral-600 opacity-40"
                }`}
              >
                {hangingUp && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Hang up, Push to Codebase
              </button>
            </div>
          </div>
        </div>

        {/* Syntax-highlighted code editor */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{ fontFamily: "'Menlo', 'Monaco', 'Consolas', monospace", fontSize: "13px", lineHeight: "1.6" }}
        >
          {/* Highlighted layer */}
          <pre
            ref={preRef}
            className="hljs absolute inset-0 m-0 p-4 overflow-auto pointer-events-none"
            style={{
              background: "transparent",
              whiteSpace: "pre",
              wordWrap: "normal",
              fontFamily: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
            }}
            dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
          />
          {/* Editable textarea on top */}
          <textarea
            ref={textareaRef}
            className="absolute inset-0 p-4 resize-none focus:outline-none"
            style={{
              background: "transparent",
              color: "transparent",
              caretColor: "#abb2bf",
              whiteSpace: "pre",
              wordWrap: "normal",
              fontFamily: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              overflow: "auto",
            }}
            value={html}
            onChange={(e) => { setHtml(e.target.value); setHasEdited(true); }}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
        </>}
      </div>
    </div>
  );
}

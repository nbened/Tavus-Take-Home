"use client";

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { DEFAULT_HTML } from "@/lib/defaultHtml";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("html", xml);

const LS_KEY = "editor_html";
const LS_PROMPT_KEY = "editor_prompt";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROMPT = `You are John, an on-call engineer. Start every conversation by greeting the user with "What's up, I'm John, the on-call engineer." Then be helpful, direct, and conversational.`;

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
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [savedPrompt, setSavedPrompt] = useState(DEFAULT_PROMPT);

  useLayoutEffect(() => {
    const saved = localStorage.getItem(LS_PROMPT_KEY);
    if (saved) {
      setPrompt(saved);
      setSavedPrompt(saved);
    }
  }, []);

  const promptIsDirty = prompt !== savedPrompt;

  function savePrompt() {
    localStorage.setItem(LS_PROMPT_KEY, prompt);
    setSavedPrompt(prompt);
  }

  // Editor state
  const [html, setHtml] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LS_KEY) ?? DEFAULT_HTML;
    }
    return DEFAULT_HTML;
  });

  // Persist html to localStorage whenever it changes, with saved indicator
  const [showSaved, setShowSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, html);
    setShowSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setShowSaved(true), 700);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
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
    const currentPrompt =
      typeof window !== "undefined"
        ? (localStorage.getItem(LS_PROMPT_KEY) ?? prompt)
        : prompt;
    const res = await fetch("/api/tavus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_prompt: currentPrompt }),
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
            <div className="flex items-center gap-2">
              <span className="font-medium">System prompt</span>
              {promptIsDirty && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </div>
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
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setPrompt(DEFAULT_PROMPT); }}
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Reset to default
                </button>
                {promptIsDirty && (
                  <button
                    onClick={savePrompt}
                    className="save-glow px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-md hover:bg-blue-400 transition-colors"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Code Editor ── */}
      <div className="w-1/2 flex flex-col bg-[#282c34] overflow-hidden">

        {/* Browser chrome */}
        <div className="shrink-0 bg-neutral-800 border-b border-neutral-700 px-3 py-2.5">
          <div className="flex items-center gap-3">
            {/* Window control dots */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            {/* URL bar */}
            <div className="flex-1 flex justify-center">
              <div className="bg-neutral-700/70 rounded-md px-4 py-0.5 text-xs text-neutral-400 font-mono w-48 text-center select-none">
                index.html
              </div>
            </div>
            {/* Saved indicator + Reset */}
            <div className="flex items-center gap-3">
              <span
                className="flex items-center gap-1 text-xs text-green-400 transition-opacity duration-300"
                style={{ opacity: showSaved ? 1 : 0 }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Changes saved
              </span>
              <button
                onClick={() => setHtml(DEFAULT_HTML)}
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                Reset
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
            onChange={(e) => setHtml(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}

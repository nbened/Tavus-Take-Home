"use client";

import { useState } from "react";

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
      color: #111;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: #555; }
    button {
      margin-top: 1rem;
      padding: 0.5rem 1.25rem;
      background: black;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
    }
    button:hover { background: #333; }
  </style>
</head>
<body>
  <h1>Hello, world!</h1>
  <p>Switch to the Preview tab to see this rendered →</p>
  <button onclick="this.textContent = 'Clicked!'">Click me</button>
</body>
</html>`;

const DEFAULT_MD = `# My Document

## Introduction

Write **bold**, _italic_, or \`inline code\` here.

## List

- Item one
- Item two
- Item three

## Code block

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> Blockquotes work too.
`;

// Minimal markdown → HTML converter (no dependencies)
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Fenced code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Blockquote
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // Bold & italic
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    // Unordered list items
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, "<ul>$1</ul>")
    // Paragraphs: blank-line-separated blocks not already wrapped
    .replace(/^(?!<[hupbl])(.+)$/gm, "<p>$1</p>")
    // Cleanup empty paragraphs
    .replace(/<p><\/p>/g, "");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family: system-ui, sans-serif; max-width: 680px; margin: 2rem auto; padding: 0 1rem; color: #111; line-height: 1.6; }
    h1,h2,h3 { font-weight: 600; margin-top: 1.5rem; }
    code { background: #f0f0f0; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f0f0f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 1rem; color: #555; }
    ul { padding-left: 1.5rem; }
  </style></head><body>${html}</body></html>`;
}

type Tab = "code" | "markdown" | "preview";

export default function ChangeCodePage() {
  const [tab, setTab] = useState<Tab>("code");
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [md, setMd] = useState(DEFAULT_MD);

  const tabs: { id: Tab; label: string }[] = [
    { id: "code", label: "Code" },
    { id: "markdown", label: "Markdown" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-neutral-950">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-neutral-800 px-3 pt-2">
        {tabs.map(({ id, label }) => (
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
        <div className="ml-auto flex gap-3 pb-2">
          {tab === "code" && (
            <button
              onClick={() => setHtml(DEFAULT_HTML)}
              className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Reset
            </button>
          )}
          {tab === "markdown" && (
            <button
              onClick={() => setMd(DEFAULT_MD)}
              className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Reset
            </button>
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
  );
}

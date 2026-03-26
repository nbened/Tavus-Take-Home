"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_HTML } from "@/lib/defaultHtml";
import confetti from "canvas-confetti";

const LS_KEY = "editor_html";

function IframeWithFallback({ html }: { html: string | null }) {
  const [iframeKey, setIframeKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);

  useEffect(() => {
    if (!html) return;
    setLoaded(false);
    setShowRefresh(false);
    const timer = setTimeout(() => setShowRefresh(true), 2500);
    return () => clearTimeout(timer);
  }, [html, iframeKey]);

  if (!html) return null;

  if (showRefresh && !loaded) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-50">
        <p className="text-neutral-400 text-sm">Page didn&apos;t load</p>
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh page
        </button>
      </div>
    );
  }

  return (
    <iframe
      key={iframeKey}
      className="w-full h-full border-0"
      srcDoc={html}
      sandbox="allow-scripts"
      title="Onboarding page"
      onLoad={() => setLoaded(true)}
    />
  );
}

export default function Home() {
  const onboardingRef = useRef<HTMLDivElement>(null);

  const [pageHtml, setPageHtml] = useState<string | null>(null);
  useLayoutEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    setPageHtml(saved ?? DEFAULT_HTML);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) setPageHtml(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [isRetry, setIsRetry] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsRetry(params.get("isRetry") === "true");
  }, []);

  function scrollToOnboarding() {
    onboardingRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (sessionStorage.getItem("scrollToOnboarding")) {
      sessionStorage.removeItem("scrollToOnboarding");
      setTimeout(() => onboardingRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, []);

  function fireConfetti() {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { x: 0.2, y: 0.5 } }), 200);
    setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { x: 0.8, y: 0.5 } }), 350);
  }

  return (
    <div className="overflow-y-scroll h-[calc(100vh-57px)] snap-y snap-mandatory">

      {/* ── Section 1: Hero ── */}
      <section className="snap-start h-[calc(100vh-57px)] flex flex-col items-center justify-between bg-white px-6 text-center py-16">
        <div />
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-3xl font-semibold tracking-tight max-w-lg">
            You&apos;ve just been hired on as the newest member of{" "}
            <span className="text-blue-600">Joja Mart</span>
          </h1>
          <p className="text-neutral-500 text-sm max-w-sm">
            Joja Mart is a made-up company. It <span className="text-blue-600">never</span> gets anyone's name wrong. That's a promise.
          </p>
        </div>
        <button
          onClick={scrollToOnboarding}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
        >
          Continue to onboarding
        </button>
      </section>

      {/* ── Section 2: Onboarding — live from the agent editor ── */}
      <section
        ref={onboardingRef}
        className="snap-start h-[calc(100vh-57px)] relative overflow-hidden"
      >
        <IframeWithFallback html={pageHtml} />

        <button
          onClick={() => {
            localStorage.setItem(LS_KEY, DEFAULT_HTML);
            setPageHtml(DEFAULT_HTML);
          }}
          className="absolute bottom-6 left-6 z-10 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Reset
        </button>

        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
          {isRetry && (
            <button
              onClick={() => {
                fireConfetti();
                setIsRetry(false);
                window.history.replaceState({}, "", window.location.pathname);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              My name is right
            </button>
          )}
          <button
            onClick={() => window.open("/agent", "_blank")}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Fix this page
          </button>
        </div>
      </section>
    </div>
  );
}

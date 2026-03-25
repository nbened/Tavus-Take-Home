"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_HTML } from "@/lib/defaultHtml";
import confetti from "canvas-confetti";

const LS_KEY = "editor_html";

export default function Home() {
  const onboardingRef = useRef<HTMLDivElement>(null);

  const [pageHtml, setPageHtml] = useState<string>(DEFAULT_HTML);
  useLayoutEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setPageHtml(saved);
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
        <iframe
          className="w-full h-full border-0"
          srcDoc={pageHtml}
          sandbox="allow-scripts"
          title="Onboarding page"
        />

        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
          {isRetry && (
            <button
              onClick={fireConfetti}
              className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              My name is right
            </button>
          )}
          <button
            onClick={() => window.open("/agent", "_blank")}
            className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            My name is wrong
          </button>
        </div>
      </section>
    </div>
  );
}

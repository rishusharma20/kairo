"use client";


import { useState, useEffect } from "react";
import { Command, Keyboard } from "lucide-react";
import { KairoOverlay } from "@/components/experience/kairo-overlay";

export default function ExperienceSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  
  const [pageContext, setPageContext] = useState<{ pageText: string, selectedText: string }>({
    pageText: "",
    selectedText: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0), 0);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Option + D (Mac) or Alt + D (Windows)
      if (e.altKey && e.code === "KeyD") {
        e.preventDefault();
        
        // Capture context before opening overlay
        setPageContext({
          pageText: document.body.innerText,
          selectedText: window.getSelection()?.toString() || "",
        });
        
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-sans relative">
      
      {/* Mock Webpage Content to simulate "browsing" */}
      <header className="w-full border-b border-black/10 py-4 px-8 flex items-center justify-between">
        <div className="font-bold text-xl tracking-tight">The Modern Web</div>
        <nav className="flex items-center gap-6 text-sm">
          <span className="cursor-pointer hover:underline">Articles</span>
          <span className="cursor-pointer hover:underline">Performance</span>
          <span className="cursor-pointer hover:underline">About</span>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto py-24 px-6">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Rendering Performance in WebGL
        </h1>
        <p className="text-black/60 mb-12 uppercase tracking-widest text-xs font-semibold">
          Published Oct 14, 2026 • By Alex Chen
        </p>

        <article className="prose prose-lg prose-neutral max-w-none space-y-8">
          <p>
            When building highly interactive 3D experiences on the web, managing frame rates is the ultimate challenge. The introduction of WebGL fundamentally shifted how we approach rendering directly in the browser. 
          </p>
          <p>
            However, achieving a locked 60fps (or 120fps on modern displays) requires strict adherence to memory management and draw call optimization. One of the primary bottlenecks developers face is CPU-bound operations preceding the actual GPU upload.
          </p>
          
          <div className="bg-black/5 p-6 rounded-lg my-8">
            <h3 className="font-bold mb-2">Quote of the Day</h3>
            <p className="italic text-black/70">
              &quot;You have power over your mind - not outside events. Realize this, and you will find strength.&quot; — Marcus Aurelius
            </p>
          </div>

          <p>
            The key takeaway is utilizing <code>requestAnimationFrame</code> for fluid updates, while decoupling your logic loops from your render loops. If your physics simulation takes 16ms, your rendering will inevitably stutter if tied to the same thread.
          </p>
        </article>
      </main>

      {/* Simulator Overlay Hint */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-4 rounded-full flex items-center gap-4 shadow-2xl z-50">
        <Keyboard className="w-5 h-5 text-white/50" />
        <span className="text-sm font-medium">UX SIMULATOR ACTIVE</span>
        <div className="h-4 w-px bg-white/20 mx-2" />
        <span className="text-sm">Press</span>
        <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded text-xs font-mono">
          {isMac ? <Command className="w-3 h-3" /> : "ALT"}
        </div>
        <span className="text-sm">+</span>
        <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded text-xs font-mono">
          D
        </div>
        <span className="text-sm ml-2 text-white/50">to open KAIRO</span>
      </div>

      {/* The actual Kairo Experience Overlay */}
      <KairoOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} context={pageContext} />

    </div>
  );
}

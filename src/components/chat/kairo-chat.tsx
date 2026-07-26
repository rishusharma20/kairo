"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertCircle } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "kairo" | "error";
  content: string;
};

export function KairoChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/extension/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "ask",
          query: trimmedInput,
          format: "General",
          context: "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "An error occurred");
      }

      const kairoMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "kairo",
        content: data.data,
      };

      setMessages((prev) => [...prev, kairoMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "error",
        content: error.message || "Failed to communicate with Kairo.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = (content: string) => {
    // Simple markdown renderer for code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        // It's a code block
        const codeContent = part.substring(3, part.length - 3).replace(/^[a-z]+[ \t]*\n/, (match) => ""); // strip optional language tag like ```python
        
        return (
          <pre key={i} className="my-3 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] overflow-x-auto text-sm font-mono text-text-primary">
            <code>{codeContent.trim()}</code>
          </pre>
        );
      }
      
      // Regular text
      return (
        <span key={i} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl h-[calc(100vh-8rem)] min-h-[500px] flex flex-col glass border border-[var(--border)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-medium tracking-wide text-text-primary">Kairo Chat</h2>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Bot className="w-12 h-12 text-text-muted" />
            <div>
              <h3 className="text-lg font-medium text-text-primary">Kairo</h3>
              <p className="text-sm text-text-muted">Ask anything.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                msg.role === "user" 
                  ? "bg-[var(--surface)] border-[var(--border)] text-text-muted" 
                  : msg.role === "error"
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : "bg-accent/10 border-accent/20 text-accent"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : msg.role === "error" ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              {/* Message Bubble */}
              <div className={`max-w-[85%] rounded-2xl p-4 ${
                msg.role === "user"
                  ? "bg-[var(--surface)] border border-[var(--border)] text-text-primary rounded-tr-sm"
                  : msg.role === "error"
                    ? "bg-destructive/5 border border-destructive/20 text-destructive rounded-tl-sm text-sm"
                    : "bg-transparent text-text-primary"
              }`}>
                {msg.role !== "user" && msg.role !== "error" && (
                  <div className="text-xs font-medium text-accent mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                    KAIRO
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="text-[10px] font-medium text-text-muted mb-1 text-right uppercase tracking-wider">
                    YOU
                  </div>
                )}
                <div className={`text-sm ${msg.role === "kairo" ? "text-text-primary/90" : ""}`}>
                  {renderContent(msg.content)}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-4 flex-row">
            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Kairo is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[var(--surface)]/50 border-t border-[var(--border)] shrink-0">
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center bg-[var(--background)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask Kairo..."
            className="flex-1 bg-transparent border-none py-3.5 pl-4 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}

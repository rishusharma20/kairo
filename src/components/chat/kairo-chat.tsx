"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertCircle, Copy, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Message = {
  id: string;
  role: "user" | "kairo" | "error";
  content: string;
};

import { ReactNode, ComponentPropsWithoutRef } from 'react';

type CodeBlockProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
};

function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group my-4 rounded-xl overflow-hidden border border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <span className="text-xs text-text-muted uppercase tracking-wider font-mono">{language}</span>
          <button
            onClick={handleCopy}
            className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1.5"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
        <div className="overflow-x-auto text-sm font-mono max-w-full">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <SyntaxHighlighter
            {...props}
            style={vscDarkPlus as any}
            language={language}
            PreTag="div"
            customStyle={{ margin: 0, background: 'transparent', padding: '1rem', minWidth: 'max-content' }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }
  return (
    <code className="bg-accent/10 text-accent px-1.5 py-0.5 rounded text-xs font-mono break-all whitespace-pre-wrap" {...props}>
      {children}
    </code>
  );
}

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
    } catch (error: unknown) {
      const e = error as Error;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "error",
        content: e.message || "Failed to communicate with Kairo.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
                  {msg.role === "kairo" ? (
                    <div className="space-y-4 leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: CodeBlock,
                          h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-text-primary">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-bold mb-3 mt-5 text-text-primary">{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-semibold mb-3 mt-4 text-text-primary">{children}</h3>,
                          p: ({children}) => <p className="mb-4 last:mb-0 text-text-primary/90">{children}</p>,
                          ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                          li: ({children}) => <li className="text-text-primary/90">{children}</li>,
                          blockquote: ({children}) => <blockquote className="border-l-2 border-accent pl-4 my-4 italic text-text-muted">{children}</blockquote>,
                          a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{children}</a>,
                          table: ({children}) => <div className="overflow-x-auto my-6"><table className="w-full text-sm border-collapse border border-[var(--border)]">{children}</table></div>,
                          thead: ({children}) => <thead className="bg-[var(--surface)] text-text-primary uppercase text-xs">{children}</thead>,
                          tbody: ({children}) => <tbody className="divide-y divide-[var(--border)]">{children}</tbody>,
                          tr: ({children}) => <tr>{children}</tr>,
                          th: ({children}) => <th className="border border-[var(--border)] px-4 py-3 font-medium text-left">{children}</th>,
                          td: ({children}) => <td className="border border-[var(--border)] px-4 py-3 text-text-primary/90">{children}</td>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  )}
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

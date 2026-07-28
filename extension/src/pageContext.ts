// extension/src/pageContext.ts

const MAX_PAGE_CONTEXT_CHARS = 10000;

interface PageContext {
  title?: string;
  url?: string;
  text: string;
  selectedText?: string;
  format: "MCQ" | "Coding" | "Interview" | "General";
}

function detectPageFormat(text: string): "MCQ" | "Coding" | "Interview" | "General" {
  // MCQ Detection: search for choice patterns (e.g., A., B., C., D. or a), b), c), d))
  const hasChoices = /(?:^|\s|\n)(?:[A-D]\s*[\.\)]|[a-d]\s*[\.\)])\s+[A-Za-z0-9]/m.test(text);
  if (hasChoices) {
    return "MCQ";
  }
  
  // Coding Problem Detection
  const hasCodingKeywords = /CONSTRAINTS|INPUT FORMAT|OUTPUT FORMAT|EXAMPLE\s*[1-9]|COMPLEXITY|TIME LIMIT/i.test(text);
  if (hasCodingKeywords) {
    return "Coding";
  }
  
  return "General";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function extractPageContext(): PageContext | null {
  const EXCLUDED_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'CANVAS', 'SVG'];

  function isElementVisible(el: HTMLElement): boolean {
    if (!el || !el.getBoundingClientRect) return false;
    
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return false;
    
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    
    return true;
  }

  let currentLength = 0;
  const BUFFER = 500;

  function walk(node: Node, textArray: string[]) {
    if (currentLength > MAX_PAGE_CONTEXT_CHARS + BUFFER) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent?.trim();
      if (txt) {
        textArray.push(txt);
        currentLength += txt.length + 1;
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Skip Kairo extension
      if (el.id === 'kairo-extension-root') return;

      // Skip excluded tags
      if (EXCLUDED_TAGS.includes(el.tagName.toUpperCase())) return;

      // Skip sensitive input elements
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        const type = el.getAttribute('type')?.toLowerCase();
        if (type === 'password' || type === 'hidden') return;
        return;
      }

      // Skip contenteditable to avoid scraping user drafts
      if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
        return;
      }

      if (!isElementVisible(el)) return;

      const isHeader = /^H[1-6]$/.test(el.tagName);
      const isListItem = el.tagName === 'LI';
      const isPre = el.tagName === 'PRE' || el.tagName === 'CODE';
      const isBlock = el.tagName === 'DIV' || el.tagName === 'P' || el.tagName === 'SECTION' || el.tagName === 'ARTICLE';

      if (isHeader || isBlock || isPre) { textArray.push('\n'); currentLength += 1; }
      if (isListItem) { textArray.push('\n- '); currentLength += 3; }
      if (isPre) { textArray.push('\n```\n'); currentLength += 5; }

      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i], textArray);
        if (currentLength > MAX_PAGE_CONTEXT_CHARS + BUFFER) break;
      }

      if (isPre) { textArray.push('\n```\n'); currentLength += 5; }
      if (isHeader || isBlock) { textArray.push('\n'); currentLength += 1; }
    }
  }

  const textParts: string[] = [];
  walk(document.body, textParts);

  let rawText = textParts.join(' ');
  rawText = rawText.replace(/\n{3,}/g, '\n\n');
  rawText = rawText.replace(/ {2,}/g, ' ');
  rawText = rawText.trim();

  // Extract selected text
  const selectedText = window.getSelection()?.toString().trim() || "";

  if (!rawText && !selectedText) return null;

  if (rawText.length > MAX_PAGE_CONTEXT_CHARS) {
    rawText = rawText.substring(0, MAX_PAGE_CONTEXT_CHARS) + '\n...[Content truncated]';
  }

  return {
    title: document.title,
    url: window.location.origin + window.location.pathname,
    text: rawText,
    selectedText: selectedText || undefined,
    format: detectPageFormat(selectedText || rawText)
  };
}

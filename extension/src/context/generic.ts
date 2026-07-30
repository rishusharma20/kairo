import { PageAdapter, PageContext } from './types';

const MAX_PAGE_CONTEXT_CHARS = 10000;
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

export const GenericAdapter: PageAdapter = {
  name: 'GenericAdapter',
  matches: () => true, // Always matches as fallback
  extract: (): PageContext | null => {
    let currentLength = 0;
    const BUFFER = 500;
    
    function walk(node: Node, textArray: string[]) {
      if (currentLength > MAX_PAGE_CONTEXT_CHARS + BUFFER) return;
      
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
        if (el.id === 'kairo-extension-root') return;
        if (EXCLUDED_TAGS.includes(el.tagName.toUpperCase())) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          const type = el.getAttribute('type')?.toLowerCase();
          if (type === 'password' || type === 'hidden') return;
          
          if (el.tagName === 'SELECT') {
            const select = el as HTMLSelectElement;
            const text = select.options[select.selectedIndex]?.text;
            if (text) {
              textArray.push(`[Selected Option: ${text}]`);
              currentLength += text.length + 20;
            }
          }
          return;
        }
        if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return;
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
    rawText = rawText.replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').trim();
    
    const selectedText = window.getSelection()?.toString().trim();
    if (!rawText && !selectedText) return null;
    
    if (rawText.length > MAX_PAGE_CONTEXT_CHARS) {
      rawText = rawText.substring(0, MAX_PAGE_CONTEXT_CHARS) + '\n...[Content truncated]';
    }
    
    const parts = [];
    if (document.title) parts.push(`PAGE TITLE:\n${document.title}`);
    if (window.location.href) parts.push(`PAGE URL:\n${window.location.href}`);
    if (selectedText) parts.push(`SELECTED TEXT:\n${selectedText}`);
    if (rawText) parts.push(`VISIBLE PAGE CONTENT:\n${rawText}`);
    
    return parts.join('\n\n');
  }
};

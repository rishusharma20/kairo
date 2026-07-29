import { PageAdapter, PageContext, QuestionType } from './types';

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

function detectQuestionType(text: string): QuestionType {
  const hasChoices = /(?:^|\s|\n)(?:[A-D]\s*[\.\)]|[a-d]\s*[\.\)])\s+[A-Za-z0-9]/m.test(text);
  if (hasChoices) return "MCQ";
  
  const hasCodingKeywords = /CONSTRAINTS|INPUT FORMAT|OUTPUT FORMAT|EXAMPLE\s*[1-9]|COMPLEXITY|TIME LIMIT/i.test(text);
  if (hasCodingKeywords) return "CODING";
  
  // Basic heuristic for numerical/short answer
  if (/calculate|find the value|how many|what is the probability/i.test(text)) return "NUMERICAL";
  if (/\?$/.test(text.trim())) return "SHORT_ANSWER";
  
  return "GENERAL";
}

function normalizeLanguage(lang: string): string {
  const l = lang.toLowerCase().trim();
  if (l.includes('c++') || l === 'cpp') return 'cpp';
  if (l.includes('c#') || l === 'csharp') return 'csharp';
  if (l.includes('java') && !l.includes('script')) return 'java';
  if (l.includes('python')) return 'python';
  if (l.includes('javascript') || l === 'js') return 'javascript';
  if (l.includes('typescript') || l === 'ts') return 'typescript';
  if (l.includes('go') || l === 'golang') return 'go';
  if (l.includes('rust')) return 'rust';
  if (l.includes('ruby')) return 'ruby';
  if (l.includes('swift')) return 'swift';
  if (l.includes('kotlin')) return 'kotlin';
  return lang.trim();
}

// A simple generic extractor.
export const GenericAdapter: PageAdapter = {
  name: 'GenericAdapter',
  matches: () => true, // Always matches as fallback
  extract: (): PageContext | null => {
    let currentLength = 0;
    const BUFFER = 500;
    
    // Scrape options if it looks like an MCQ page
    const options: {label?: string, text: string}[] = [];
    const languageCandidates: string[] = [];
    
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
          
          // Try to extract selected language from common dropdowns
          if (el.tagName === 'SELECT') {
            const select = el as HTMLSelectElement;
            const text = select.options[select.selectedIndex]?.text;
            if (text && /c\+\+|java|python|javascript|rust|go/i.test(text)) {
              languageCandidates.push(text);
            }
          }
          return;
        }
        if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return;
        if (!isElementVisible(el)) return;
        
        // MCQ Option Detection
        if (el.tagName === 'LABEL' && (el.querySelector('input[type="radio"]') || el.querySelector('input[type="checkbox"]'))) {
            const labelText = el.textContent?.trim();
            if (labelText) options.push({ text: labelText });
        }
        
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
    
    const relevantText = selectedText || rawText;
    const qType = detectQuestionType(relevantText);
    
    const ctx: PageContext = {
      pageTitle: document.title,
      pageUrl: window.location.href,
      questionType: qType,
      visibleContext: rawText
    };
    
    if (selectedText) {
      ctx.question = selectedText;
    }
    
    if (options.length > 0) {
      ctx.options = options;
      ctx.questionType = 'MCQ'; // Force MCQ if options exist
    }
    
    if (qType === 'CODING' && languageCandidates.length > 0) {
      const display = languageCandidates[0];
      ctx.selectedLanguage = {
        display,
        normalized: normalizeLanguage(display)
      };
    }
    
    return ctx;
  }
};

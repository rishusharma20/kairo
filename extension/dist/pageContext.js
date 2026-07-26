"use strict";
// extension/src/pageContext.ts
const MAX_PAGE_CONTEXT_CHARS = 10000;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractPageContext() {
    const EXCLUDED_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'CANVAS', 'SVG'];
    function isElementVisible(el) {
        if (!el || !el.getBoundingClientRect)
            return false;
        // Fast checks first
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0)
            return false;
        if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden'))
            return false;
        // Expensive check last
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
            return false;
        return true;
    }
    let currentLength = 0;
    const BUFFER = 500;
    function walk(node, textArray) {
        // Abort early if we have enough context
        if (currentLength > MAX_PAGE_CONTEXT_CHARS + BUFFER) {
            return;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.textContent?.trim();
            if (txt) {
                textArray.push(txt);
                currentLength += txt.length + 1; // +1 for assumed space joining later
            }
            return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            // Skip Kairo extension
            if (el.id === 'kairo-extension-root')
                return;
            // Skip excluded tags
            if (EXCLUDED_TAGS.includes(el.tagName.toUpperCase()))
                return;
            // Skip sensitive input elements
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                const type = el.getAttribute('type')?.toLowerCase();
                if (type === 'password' || type === 'hidden')
                    return;
                // Skip extracting any values from forms to avoid sensitive data leakage
                return;
            }
            // Skip contenteditable to avoid scraping user drafts
            if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
                return;
            }
            // Check visibility - if not visible, prune entire subtree!
            if (!isElementVisible(el))
                return;
            // Add structural formatting hints
            const isHeader = /^H[1-6]$/.test(el.tagName);
            const isListItem = el.tagName === 'LI';
            const isPre = el.tagName === 'PRE' || el.tagName === 'CODE';
            const isBlock = el.tagName === 'DIV' || el.tagName === 'P' || el.tagName === 'SECTION' || el.tagName === 'ARTICLE';
            if (isHeader || isBlock || isPre) {
                textArray.push('\n');
                currentLength += 1;
            }
            if (isListItem) {
                textArray.push('\n- ');
                currentLength += 3;
            }
            if (isPre) {
                textArray.push('\n```\n');
                currentLength += 5;
            }
            for (let i = 0; i < el.childNodes.length; i++) {
                walk(el.childNodes[i], textArray);
                if (currentLength > MAX_PAGE_CONTEXT_CHARS + BUFFER)
                    break;
            }
            if (isPre) {
                textArray.push('\n```\n');
                currentLength += 5;
            }
            if (isHeader || isBlock) {
                textArray.push('\n');
                currentLength += 1;
            }
        }
    }
    const textParts = [];
    walk(document.body, textParts);
    // Clean and normalize text
    let rawText = textParts.join(' ');
    // Remove consecutive newlines exceeding 2
    rawText = rawText.replace(/\n{3,}/g, '\n\n');
    // Remove excessive spaces while preserving line breaks
    rawText = rawText.replace(/ {2,}/g, ' ');
    rawText = rawText.trim();
    if (!rawText)
        return null;
    if (rawText.length > MAX_PAGE_CONTEXT_CHARS) {
        rawText = rawText.substring(0, MAX_PAGE_CONTEXT_CHARS) + '\n...[Content truncated]';
    }
    return {
        title: document.title,
        // Sanitize URL by removing hash and query parameters that might contain sensitive tokens
        url: window.location.origin + window.location.pathname,
        text: rawText
    };
}

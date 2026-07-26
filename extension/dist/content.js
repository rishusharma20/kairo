"use strict";
// Kairo Extension Content Script
// Objective 7: Safe Page Context Extraction
const KAIRO_ROOT_ID = 'kairo-extension-root';
function initKairo() {
    if (document.getElementById(KAIRO_ROOT_ID)) {
        console.log('Kairo extension root already exists.');
        return;
    }
    const host = document.createElement('div');
    host.id = KAIRO_ROOT_ID;
    host.style.position = 'fixed';
    host.style.bottom = '24px';
    host.style.right = '24px';
    host.style.zIndex = '2147483647';
    host.style.display = 'block';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
    :host {
      --background: #050505;
      --foreground: #fafafa;
      --surface: #0a0a0a;
      --card: rgba(255, 255, 255, 0.03);
      --border: rgba(255, 255, 255, 0.06);
      --border-focus: rgba(0, 212, 255, 0.5);
      --text-primary: #fafafa;
      --text-muted: rgba(255, 255, 255, 0.4);
      --accent: #00D4FF;
      --accent-dim: rgba(0, 212, 255, 0.15);
      --destructive: #ff3b30;
      --glass-bg: rgba(255, 255, 255, 0.03);
      --glass-blur: 16px;
      
      font-family: system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
    }
    
    * { box-sizing: inherit; }
    .hidden { display: none !important; }

    .kairo-panel {
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 48px);
      max-width: calc(100vw - 48px);
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur));
      -webkit-backdrop-filter: blur(var(--glass-blur));
      border: 1px solid var(--border);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      color: var(--text-primary);
    }
    
    .kairo-header {
      padding: 16px;
      border-bottom: 1px solid var(--border);
      background: rgba(10, 10, 10, 0.5);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    
    .kairo-title { font-size: 14px; font-weight: 500; letter-spacing: 0.5px; margin: 0; }
    .kairo-subtitle { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
    
    .kairo-close {
      background: transparent; border: none; color: var(--text-muted); cursor: pointer;
      padding: 4px; display: flex; align-items: center; justify-content: center;
      border-radius: 4px; transition: color 0.2s, background 0.2s;
    }
    .kairo-close:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.1); }
    
    /* State Views */
    .state-container {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center; padding: 24px;
    }
    .state-title { font-size: 18px; font-weight: 500; margin: 0 0 8px 0; }
    .state-subtitle { font-size: 14px; color: var(--text-muted); margin: 0 0 24px 0; line-height: 1.5; }
    
    .kairo-button {
      background: var(--text-primary); color: var(--background); border: none;
      border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: opacity 0.2s;
    }
    .kairo-button:hover { opacity: 0.9; }
    
    .spinner {
      width: 24px; height: 24px; border: 3px solid var(--border);
      border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Chat View */
    .chat-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .kairo-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
    .kairo-messages::-webkit-scrollbar { width: 6px; }
    .kairo-messages::-webkit-scrollbar-track { background: transparent; }
    .kairo-messages::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 9999px; }
    .kairo-messages::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
    
    .kairo-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.5; text-align: center; }
    .kairo-empty-title { font-size: 18px; font-weight: 500; margin: 0 0 8px 0; }
    .kairo-empty-subtitle { font-size: 14px; margin: 0; }
    
    .message-row { display: flex; width: 100%; }
    .message-row.user { justify-content: flex-end; }
    .message-row.error { justify-content: flex-start; }
    
    .message-bubble {
      max-width: 85%; padding: 12px 16px; font-size: 14px; line-height: 1.5;
      word-break: break-word; white-space: pre-wrap;
    }
    .message-bubble.user { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; border-top-right-radius: 4px; }
    .message-bubble.kairo { background: transparent; color: var(--text-primary); }
    .message-bubble.error { background: rgba(255, 59, 48, 0.05); border: 1px solid rgba(255, 59, 48, 0.2); color: var(--destructive); border-radius: 16px; border-top-left-radius: 4px; }
    
    .message-meta { font-size: 10px; font-weight: 500; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .message-row.user .message-meta { text-align: right; }
    
    .kairo-input-area { padding: 16px; background: rgba(10, 10, 10, 0.5); border-top: 1px solid var(--border); flex-shrink: 0; }
    .kairo-input-wrapper { position: relative; display: flex; align-items: flex-end; background: var(--background); border: 1px solid var(--border); border-radius: 12px; transition: border-color 0.2s, box-shadow 0.2s; }
    .kairo-input-wrapper:focus-within { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
    .kairo-input { flex: 1; background: transparent; border: none; color: var(--text-primary); font-family: inherit; font-size: 14px; padding: 12px 12px; resize: none; min-height: 44px; max-height: 120px; outline: none; }
    .kairo-input::placeholder { color: var(--text-muted); }
    .kairo-send { background: var(--accent-dim); border: none; color: var(--accent); width: 32px; height: 32px; border-radius: 8px; margin: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; }
    .kairo-send:hover:not(:disabled) { background: rgba(0, 212, 255, 0.25); }
    .kairo-send:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .loading-bubble { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-muted); padding: 12px 0; }
    .loading-spinner { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; }
    
    .markdown-code { background: var(--background); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; overflow-x: auto; margin: 8px 0; white-space: pre; }
    
    .context-indicator { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    
    @media (max-width: 480px) {
      .kairo-panel { width: calc(100vw - 32px); height: calc(100vh - 32px); }
      :host { bottom: 16px !important; right: 16px !important; }
    }
  `;
    const container = document.createElement('div');
    container.className = 'kairo-panel';
    container.innerHTML = `
    <div class="kairo-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: var(--accent-dim); border: 1px solid rgba(0, 212, 255, 0.2); display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div>
          <h2 class="kairo-title">Kairo</h2>
          <p class="kairo-subtitle">AI Assistant</p>
        </div>
      </div>
      <button class="kairo-close" aria-label="Close Kairo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    
    <div id="state-loading" class="state-container">
      <div class="spinner"></div>
    </div>
    
    <div id="state-unauth" class="state-container hidden">
      <h3 class="state-title">Kairo</h3>
      <p class="state-subtitle">Sign in to Kairo to continue.</p>
      <button class="kairo-button" id="btn-signin">Sign In</button>
    </div>
    
    <div id="state-error" class="state-container hidden">
      <h3 class="state-title">Connection Error</h3>
      <p class="state-subtitle">Unable to connect to Kairo.</p>
      <button class="kairo-button" id="btn-retry">Retry</button>
    </div>
    
    <div id="state-blocked" class="state-container hidden">
      <h3 class="state-title">Kairo</h3>
      <p class="state-subtitle">Your account is currently unavailable.</p>
    </div>
    
    <div id="chat-view" class="chat-view hidden">
      <div class="kairo-messages" id="kairo-messages">
        <div class="kairo-empty" id="kairo-empty">
          <h3 class="kairo-empty-title">Kairo</h3>
          <p class="kairo-empty-subtitle">Ask anything.</p>
        </div>
      </div>
      
      <div class="kairo-input-area">
        <div id="kairo-context-indicator" class="context-indicator hidden">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Includes page context
        </div>
        <div class="kairo-input-wrapper">
          <textarea class="kairo-input" id="kairo-input" placeholder="Ask Kairo..." rows="1"></textarea>
          <button class="kairo-send" id="kairo-send" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  `;
    shadow.appendChild(style);
    shadow.appendChild(container);
    let isProcessing = false;
    const viewLoading = shadow.querySelector('#state-loading');
    const viewUnauth = shadow.querySelector('#state-unauth');
    const viewError = shadow.querySelector('#state-error');
    const viewBlocked = shadow.querySelector('#state-blocked');
    const viewChat = shadow.querySelector('#chat-view');
    const allViews = [viewLoading, viewUnauth, viewError, viewBlocked, viewChat];
    function showView(view) {
        allViews.forEach(v => v.classList.add('hidden'));
        view.classList.remove('hidden');
    }
    function checkAuth() {
        showView(viewLoading);
        chrome.runtime.sendMessage({ type: 'AUTH_CHECK' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                showView(viewError);
                return;
            }
            switch (response.status) {
                case 'AUTHENTICATED':
                    showView(viewChat);
                    break;
                case 'UNAUTHENTICATED':
                    showView(viewUnauth);
                    break;
                case 'BLOCKED':
                    showView(viewBlocked);
                    break;
                case 'ERROR':
                default:
                    showView(viewError);
                    break;
            }
        });
    }
    const btnSignin = shadow.querySelector('#btn-signin');
    const btnRetry = shadow.querySelector('#btn-retry');
    const closeBtn = shadow.querySelector('.kairo-close');
    btnSignin.addEventListener('click', () => window.open('http://localhost:3000/auth/login', '_blank'));
    btnRetry.addEventListener('click', checkAuth);
    closeBtn.addEventListener('click', () => host.style.display = 'none');
    // Chat Logic
    const sendBtn = shadow.querySelector('#kairo-send');
    const inputEl = shadow.querySelector('#kairo-input');
    const messagesEl = shadow.querySelector('#kairo-messages');
    const emptyEl = shadow.querySelector('#kairo-empty');
    function updateInputState() {
        sendBtn.disabled = isProcessing;
        inputEl.disabled = isProcessing;
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    }
    inputEl.addEventListener('input', updateInputState);
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    });
    sendBtn.addEventListener('click', handleSubmit);
    function parseAndRenderMarkdown(content, container) {
        const parts = content.split(/(```[\s\S]*?```)/g);
        parts.forEach(part => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const codeContent = part.substring(3, part.length - 3).replace(/^[a-z]+[ \t]*\n/, () => "");
                const pre = document.createElement('pre');
                pre.className = 'markdown-code';
                const code = document.createElement('code');
                code.textContent = codeContent.trim();
                pre.appendChild(code);
                container.appendChild(pre);
            }
            else if (part) {
                const span = document.createElement('span');
                span.textContent = part;
                container.appendChild(span);
            }
        });
    }
    function addMessage(role, text) {
        if (emptyEl && !emptyEl.classList.contains('hidden')) {
            emptyEl.classList.add('hidden');
        }
        const row = document.createElement('div');
        row.className = `message-row ${role}`;
        const bubbleWrapper = document.createElement('div');
        if (role === 'kairo') {
            const meta = document.createElement('div');
            meta.className = 'message-meta';
            meta.style.textAlign = 'left';
            meta.textContent = 'KAIRO';
            bubbleWrapper.appendChild(meta);
        }
        else if (role === 'user') {
            const meta = document.createElement('div');
            meta.className = 'message-meta';
            meta.textContent = 'YOU';
            bubbleWrapper.appendChild(meta);
        }
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${role}`;
        if (role === 'kairo') {
            parseAndRenderMarkdown(text, bubble);
        }
        else {
            bubble.textContent = text;
        }
        bubbleWrapper.appendChild(bubble);
        row.appendChild(bubbleWrapper);
        messagesEl.appendChild(row);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function handleSubmit() {
        if (isProcessing)
            return;
        const text = inputEl.value.trim();
        isProcessing = true;
        updateInputState();
        if (text) {
            addMessage('user', text);
        }
        inputEl.value = '';
        updateInputState();
        let contextText = '';
        const ctx = typeof extractPageContext === 'function' ? extractPageContext() : null;
        if (ctx) {
            contextText = ctx.text;
            const indicator = shadow.querySelector('#kairo-context-indicator');
            if (indicator) {
                indicator.classList.remove('hidden');
            }
        }
        else if (!text) {
            // Empty prompt + no context = show error without network request
            isProcessing = false;
            updateInputState();
            const errRow = document.createElement('div');
            errRow.className = `message-row kairo`;
            const errBubbleWrapper = document.createElement('div');
            errBubbleWrapper.className = 'message-bubble-wrapper kairo';
            const errBubble = document.createElement('div');
            errBubble.className = `message-bubble kairo`;
            errBubble.textContent = "No useful page content was found to analyze.";
            errBubbleWrapper.appendChild(errBubble);
            errRow.appendChild(errBubbleWrapper);
            messagesEl.appendChild(errRow);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return;
        }
        const loadingRow = document.createElement('div');
        loadingRow.className = 'loading-bubble';
        loadingRow.id = 'kairo-loading';
        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'loading-spinner';
        const loadingSpan = document.createElement('span');
        loadingSpan.textContent = text ? 'Kairo is thinking...' : 'Analyzing current page...';
        loadingRow.appendChild(spinnerDiv);
        loadingRow.appendChild(loadingSpan);
        messagesEl.appendChild(loadingRow);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        chrome.runtime.sendMessage({ type: 'AI_QUERY', payload: { query: text, context: contextText } }, (response) => {
            const loader = shadow.querySelector('#kairo-loading');
            if (loader)
                loader.remove();
            const indicator = shadow.querySelector('#kairo-context-indicator');
            if (indicator)
                indicator.classList.add('hidden');
            isProcessing = false;
            updateInputState();
            if (chrome.runtime.lastError || !response) {
                addMessage('error', 'Failed to communicate with Kairo.');
                return;
            }
            if (response.status === 'SUCCESS') {
                addMessage('kairo', response.data);
            }
            else if (response.status === 'UNAUTHENTICATED' || response.status === 'BLOCKED') {
                checkAuth(); // Re-sync auth state natively
            }
            else {
                addMessage('error', response.error || 'An error occurred.');
            }
        });
    }
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'TOGGLE_KAIRO') {
            if (host.style.display === 'none') {
                host.style.display = 'block';
                if (!viewChat.classList.contains('hidden') && !isProcessing) {
                    inputEl.focus();
                }
            }
            else {
                host.style.display = 'none';
            }
        }
    });
    checkAuth();
}
initKairo();

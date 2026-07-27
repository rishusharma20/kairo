// Kairo Extension Content Script
// Objective 7: Safe Page Context Extraction

declare function extractPageContext(): { title?: string, url?: string, text: string } | null;

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
  host.style.display = 'none'; // Initial state is CLOSED

  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      --background: #050505;
      --foreground: #fafafa;
      --surface: #0a0a0a;
      --card: rgba(255, 255, 255, 0.03);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(0, 212, 255, 0.5);
      --text-primary: #fafafa;
      --text-muted: rgba(255, 255, 255, 0.45);
      --accent: #00D4FF;
      --accent-dim: rgba(0, 212, 255, 0.15);
      --destructive: #ff3b30;
      --glass-bg: rgba(10, 10, 10, 0.75);
      --glass-blur: 24px;
      
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
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
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
    
    .kairo-title { font-size: 14px; font-weight: 600; letter-spacing: 0.5px; margin: 0; }
    .kairo-subtitle { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
    
    .kairo-close {
      background: transparent; border: none; color: var(--text-muted); cursor: pointer;
      padding: 4px; display: flex; align-items: center; justify-content: center;
      border-radius: 6px; transition: color 0.2s, background 0.2s;
    }
    .kairo-close:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.08); }
    
    /* State Views */
    .state-container {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center; padding: 28px;
    }
    .state-title { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.02em; }
    .state-subtitle { font-size: 14px; color: var(--text-muted); margin: 0 0 20px 0; line-height: 1.5; }
    
    .kairo-button {
      background: var(--text-primary); color: var(--background); border: none;
      border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: opacity 0.2s; width: 100%;
    }
    .kairo-button:hover { opacity: 0.95; }
    
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border);
      border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Login Form styles */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      margin-top: 8px;
    }
    
    .form-input {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 11px 14px;
      font-size: 14px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
    }
    .form-input:focus {
      border-color: var(--accent);
    }
    
    .form-footer {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: 20px;
      font-size: 12px;
    }
    
    .form-link {
      color: var(--accent);
      text-decoration: none;
      cursor: pointer;
      font-weight: 500;
    }
    .form-link:hover {
      text-decoration: underline;
    }

    /* Meta Bar Info */
    .meta-bar {
      padding: 8px 16px;
      background: rgba(10, 10, 10, 0.4);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    
    .meta-plan {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--accent);
    }

    .meta-credits {
      font-weight: 500;
    }

    .logout-link {
      background: transparent;
      border: none;
      color: var(--destructive);
      font-size: 11px;
      cursor: pointer;
      padding: 0;
      font-weight: 600;
    }
    .logout-link:hover {
      text-decoration: underline;
    }

    /* Chat View */
    .chat-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .kairo-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
    .kairo-messages::-webkit-scrollbar { width: 6px; }
    .kairo-messages::-webkit-scrollbar-track { background: transparent; }
    .kairo-messages::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 9999px; }
    .kairo-messages::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
    
    .kairo-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.5; text-align: center; }
    .kairo-empty-title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
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
    
    .message-meta { font-size: 10px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
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
      <form id="login-form" class="login-form">
        <input type="email" id="login-email" class="form-input" placeholder="Email" required />
        <input type="password" id="login-password" class="form-input" placeholder="Password" required />
        <button type="submit" class="kairo-button" id="btn-submit-signin">Sign In</button>
      </form>
      <div id="login-error" class="message-bubble error hidden" style="margin-top: 12px; font-size: 12px; width: 100%;"></div>
      <div class="form-footer">
        <a class="form-link" id="link-forgot">Forgot Password?</a>
        <a class="form-link" id="link-website">Open Website</a>
      </div>
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
      <div id="meta-bar" class="meta-bar">
        <span id="meta-plan" class="meta-plan">Plan: -</span>
        <span id="meta-credits" class="meta-credits">- / - used</span>
        <button id="btn-logout" class="logout-link">Logout</button>
      </div>
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

  const viewLoading = shadow.querySelector('#state-loading') as HTMLDivElement;
  const viewUnauth = shadow.querySelector('#state-unauth') as HTMLDivElement;
  const viewError = shadow.querySelector('#state-error') as HTMLDivElement;
  const viewBlocked = shadow.querySelector('#state-blocked') as HTMLDivElement;
  const viewChat = shadow.querySelector('#chat-view') as HTMLDivElement;
  const allViews = [viewLoading, viewUnauth, viewError, viewBlocked, viewChat];

  function showView(view: HTMLDivElement) {
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
          const metaPlan = shadow.querySelector('#meta-plan') as HTMLSpanElement;
          const metaCredits = shadow.querySelector('#meta-credits') as HTMLSpanElement;
          if (response.user) {
            metaPlan.textContent = `Plan: ${response.user.plan}`;
          }
          showView(viewChat);
          
          // Asynchronously load database quota to prevent UI rendering delays
          chrome.runtime.sendMessage({ type: 'GET_QUOTA' }, (quotaResponse) => {
            if (!chrome.runtime.lastError && quotaResponse && quotaResponse.status === 'SUCCESS' && quotaResponse.user) {
              metaCredits.textContent = `${quotaResponse.user.requests_used} / ${quotaResponse.user.daily_limit} used`;
            }
          });
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

  // Login Form Handlers
  const loginForm = shadow.querySelector('#login-form') as HTMLFormElement;
  const loginEmail = shadow.querySelector('#login-email') as HTMLInputElement;
  const loginPassword = shadow.querySelector('#login-password') as HTMLInputElement;
  const loginError = shadow.querySelector('#login-error') as HTMLDivElement;
  const btnRetry = shadow.querySelector('#btn-retry') as HTMLButtonElement;
  const closeBtn = shadow.querySelector('.kairo-close') as HTMLButtonElement;
  const linkForgot = shadow.querySelector('#link-forgot') as HTMLAnchorElement;
  const linkWebsite = shadow.querySelector('#link-website') as HTMLAnchorElement;
  const btnLogout = shadow.querySelector('#btn-logout') as HTMLButtonElement;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    showView(viewLoading);
    chrome.runtime.sendMessage({ type: 'LOGIN', payload: { email, password } }, (response) => {
      if (chrome.runtime.lastError || !response) {
        showView(viewUnauth);
        loginError.textContent = 'Connection error.';
        loginError.classList.remove('hidden');
        return;
      }
      if (response.status === 'SUCCESS') {
        loginEmail.value = '';
        loginPassword.value = '';
        checkAuth();
      } else {
        showView(viewUnauth);
        loginError.textContent = response.error || 'Invalid credentials.';
        loginError.classList.remove('hidden');
      }
    });
  });

  linkForgot.addEventListener('click', () => {
    window.open('https://aikairo.vercel.app/auth/forgot-password', '_blank');
  });

  linkWebsite.addEventListener('click', () => {
    window.open('https://aikairo.vercel.app', '_blank');
  });

  btnLogout.addEventListener('click', () => {
    showView(viewLoading);
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      checkAuth();
    });
  });

  btnRetry.addEventListener('click', checkAuth);
  closeBtn.addEventListener('click', () => host.style.display = 'none');

  // Chat Logic
  const sendBtn = shadow.querySelector('#kairo-send') as HTMLButtonElement;
  const inputEl = shadow.querySelector('#kairo-input') as HTMLTextAreaElement;
  const messagesEl = shadow.querySelector('#kairo-messages') as HTMLDivElement;
  const emptyEl = shadow.querySelector('#kairo-empty') as HTMLDivElement;

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

  function parseAndRenderMarkdown(content: string, container: HTMLElement) {
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
      } else if (part) {
        const span = document.createElement('span');
        span.textContent = part;
        container.appendChild(span);
      }
    });
  }

  function addMessage(role: 'user' | 'kairo' | 'error', text: string) {
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
    } else if (role === 'user') {
      const meta = document.createElement('div');
      meta.className = 'message-meta';
      meta.textContent = 'YOU';
      bubbleWrapper.appendChild(meta);
    }
    
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role}`;
    
    if (role === 'kairo') {
      parseAndRenderMarkdown(text, bubble);
    } else {
      bubble.textContent = text;
    }
    
    bubbleWrapper.appendChild(bubble);
    row.appendChild(bubbleWrapper);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function handleSubmit() {
    if (isProcessing) return;
    const text = inputEl.value.trim();

    isProcessing = true;
    updateInputState();
    
    if (text) {
      addMessage('user', text);
    }
    
    inputEl.value = '';
    updateInputState();

    let contextText = '';
    let detectedFormat = 'General';
    const ctx = typeof extractPageContext === 'function' ? extractPageContext() : null;
    if (ctx) {
      const parts = [];
      if (ctx.url) parts.push(`Page URL: ${ctx.url}`);
      if (ctx.title) parts.push(`Page Title: ${ctx.title}`);
      if (ctx.selectedText) {
        parts.push(`[SELECTED TEXT]\n${ctx.selectedText}\n[/SELECTED TEXT]`);
      }
      if (ctx.text) {
        parts.push(`[VISIBLE PAGE CONTENT]\n${ctx.text}\n[/VISIBLE PAGE CONTENT]`);
      }
      contextText = parts.join('\n\n');
      detectedFormat = ctx.format;
      
      const indicator = shadow.querySelector('#kairo-context-indicator');
      if (indicator) {
        indicator.classList.remove('hidden');
      }
    } else if (!text) {
      isProcessing = false;
      updateInputState();
      addMessage('error', 'Ask Kairo something.');
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

    chrome.runtime.sendMessage({ 
      type: 'AI_QUERY', 
      payload: { 
        query: text, 
        context: contextText, 
        format: detectedFormat 
      } 
    }, (response) => {
      const loader = shadow.querySelector('#kairo-loading');
      if (loader) loader.remove();
      
      const indicator = shadow.querySelector('#kairo-context-indicator');
      if (indicator) indicator.classList.add('hidden');
      
      isProcessing = false;
      updateInputState();

      if (chrome.runtime.lastError || !response) {
        addMessage('error', 'Failed to communicate with Kairo.');
        return;
      }

      if (response.status === 'SUCCESS') {
        addMessage('kairo', response.data);
        checkAuth(); // Update credits bar
      } else if (response.status === 'UNAUTHENTICATED' || response.status === 'BLOCKED') {
        checkAuth();
      } else {
        addMessage('error', response.error || 'An error occurred.');
      }
    });
  }

  // Handle panel toggle cleanly (Debounced to prevent double toggling when both keyboard & chrome commands fire)
  let lastToggleTime = 0;
  function toggleKairo() {
    const now = Date.now();
    if (now - lastToggleTime < 200) return;
    lastToggleTime = now;

    if (host.style.display === 'none') {
      host.style.display = 'block';
      checkAuth(); // Validate auth and refresh limits on opening
      
      // Update context indicator on open
      const ctx = typeof extractPageContext === 'function' ? extractPageContext() : null;
      const indicator = shadow.querySelector('#kairo-context-indicator');
      if (indicator) {
        if (ctx && (ctx.selectedText || ctx.text)) {
          indicator.classList.remove('hidden');
        } else {
          indicator.classList.add('hidden');
        }
      }

      setTimeout(() => {
        const inputField = shadow.querySelector('#kairo-input') as HTMLTextAreaElement;
        if (inputField) inputField.focus();
      }, 50);
    } else {
      host.style.display = 'none';
    }
  }

  // Toggle message Listener (from background script commands)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_KAIRO') {
      toggleKairo();
    }
  });

  // Local keydown listener for Alt+D/Option+D direct page toggles
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyD') {
      e.preventDefault();
      toggleKairo();
    }
  });

  // Escape key hides Kairo panel (both globally and within Shadow DOM)
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      host.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && host.style.display !== 'none') {
      host.style.display = 'none';
    }
  });
}

initKairo();

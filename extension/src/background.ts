// Kairo Extension Background Script

const BACKEND_URL = "https://aikairo.vercel.app";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_CHECK') {
    handleAuthCheck().then(sendResponse);
    return true; // Keep the message channel open for the async response
  }
  if (message.type === 'AI_QUERY') {
    handleAIQuery(message.payload).then(sendResponse);
    return true;
  }
  if (message.type === 'LOGIN') {
    handleLogin(message.payload).then(sendResponse);
    return true;
  }
  if (message.type === 'LOGOUT') {
    handleLogout().then(sendResponse);
    return true;
  }
});

async function handleAuthCheck() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include' // This relies on host_permissions to attach SameSite=Lax/None cookies
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        try {
          const data = await response.json();
          return { status: 'UNAUTHENTICATED', data };
        } catch {
          return { status: 'UNAUTHENTICATED' };
        }
      }
      return { status: 'ERROR', error: 'Backend returned ' + response.status };
    }

    const data = await response.json();
    if (data.authenticated) {
      if (data.user?.status === 'BLOCKED' || data.user?.status === 'DELETED') {
        return { status: 'BLOCKED', user: data.user };
      }
      return { status: 'AUTHENTICATED', user: data.user };
    }
    
    return { status: 'UNAUTHENTICATED' };
  } catch (error) {
    console.error('Kairo Auth Check Error:', error);
    return { status: 'ERROR', error: (error as Error).message };
  }
}

async function handleLogin(payload: { email: string, password: string }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: payload.email,
        password: payload.password
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { status: 'ERROR', error: data.error || 'Login failed.' };
    }
    return { status: 'SUCCESS', user: data.user };
  } catch (error) {
    console.error('Kairo Login Error:', error);
    return { status: 'ERROR', error: 'Network error during login.' };
  }
}

async function handleLogout() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      return { status: 'ERROR', error: 'Logout failed.' };
    }
    return { status: 'SUCCESS' };
  } catch (error) {
    console.error('Kairo Logout Error:', error);
    return { status: 'ERROR', error: 'Network error during logout.' };
  }
}

async function handleAIQuery(payload: { query: string, context?: string }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/extension/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        feature: payload.query ? 'ask' : 'page_analyze',
        query: payload.query || '',
        format: 'General',
        context: payload.context || ''
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { status: 'UNAUTHENTICATED' };
      }
      return { status: 'ERROR', error: data.error || 'Request failed with status ' + response.status };
    }

    return { status: 'SUCCESS', data: data.data };
  } catch (error) {
    console.error('Kairo AI Query Error:', error);
    return { status: 'ERROR', error: 'Network or server error.' };
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === '_toggle_kairo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_KAIRO' }).catch(() => {
          // Ignore errors gracefully (e.g. on chrome:// pages where content script is not injected)
        });
      }
    });
  }
});

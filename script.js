/**
 * Aurora Titan — script.js
 *
 * IDs (all verified against index.html):
 *   userInput, sendBtn, chatContainer, chatMessages, welcomeScreen
 *   newChatBtn, sidebar, sidebarOpenBtn, sidebarCloseBtn, sidebarOverlay, chatHistoryList
 *   settingsBtn, settingsModal, closeSettingsBtn, cancelSettingsBtn
 *   saveSettingsBtn, clearMemoryBtn, systemPromptInput, modelSelect
 *   Suggestion cards: queried by class .suggestion-card (data-prompt attr)
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ═══════════════════════════════════════════════════════
       1. DOM REFERENCES
    ═══════════════════════════════════════════════════════ */
    const $ = id => document.getElementById(id);

    const userInput         = $('userInput');
    const sendBtn           = $('sendBtn');
    const chatContainer     = $('chatContainer');
    const chatMessages      = $('chatMessages');
    const welcomeScreen     = $('welcomeScreen');
    const newChatBtn        = $('newChatBtn');

    const sidebar           = $('sidebar');
    const sidebarOpenBtn    = $('sidebarOpenBtn');
    const sidebarCloseBtn   = $('sidebarCloseBtn');
    const sidebarOverlay    = $('sidebarOverlay');
    const chatHistoryList   = $('chatHistoryList');

    const settingsBtn       = $('settingsBtn');
    const settingsModal     = $('settingsModal');
    const closeSettingsBtn  = $('closeSettingsBtn');
    const cancelSettingsBtn = $('cancelSettingsBtn');
    const saveSettingsBtn   = $('saveSettingsBtn');
    const clearMemoryBtn    = $('clearMemoryBtn');
    const systemPromptInput = $('systemPromptInput');
    const modelSelect       = $('modelSelect');

    /* ═══════════════════════════════════════════════════════
       2. STATE
    ═══════════════════════════════════════════════════════ */
    let chatHistory  = [];
    let isProcessing = false;

    /* ═══════════════════════════════════════════════════════
       3. MARKED.JS + HIGHLIGHT.JS CONFIGURATION
    ═══════════════════════════════════════════════════════ */
    const renderer = new marked.Renderer();

    renderer.code = function (code, lang) {
        const validLang   = !!(lang && hljs.getLanguage(lang));
        const highlighted = validLang
            ? hljs.highlight(code, { language: lang }).value
            : hljs.highlightAuto(code).value;
        const displayLang = lang || 'text';

        // Encode for data attribute — avoids XSS and broken attribute parsing
        const b64 = btoa(unescape(encodeURIComponent(code)));

        return `
<div class="code-block-wrapper">
  <div class="code-header">
    <span class="code-lang">${displayLang}</span>
    <button class="copy-btn" onclick="copyCode(this)" data-b64="${b64}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      Copy
    </button>
  </div>
  <pre><code class="hljs ${validLang ? 'language-' + lang : ''}">${highlighted}</code></pre>
</div>`;
    };

    marked.use({ renderer, gfm: true, breaks: true });

    /* ═══════════════════════════════════════════════════════
       4. GLOBAL COPY FUNCTION
    ═══════════════════════════════════════════════════════ */
    window.copyCode = function (btn) {
        try {
            const b64  = btn.getAttribute('data-b64') || '';
            const text = decodeURIComponent(escape(atob(b64)));
            navigator.clipboard.writeText(text).then(() => {
                const orig = btn.innerHTML;
                btn.innerHTML = '✓ Copied';
                btn.classList.add('copied');
                setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
            });
        } catch (e) { console.warn('Copy failed', e); }
    };

    /* ═══════════════════════════════════════════════════════
       5. LOCALSTORAGE HELPERS
    ═══════════════════════════════════════════════════════ */
    const LS = {
        get: k       => localStorage.getItem(k) || '',
        set: (k, v)  => localStorage.setItem(k, v),
        del: k       => localStorage.removeItem(k)
    };

    function loadSettings() {
        const m = LS.get('aiModel');
        if (m) modelSelect.value = m;
        systemPromptInput.value = LS.get('systemPrompt');
    }
    loadSettings();

    /* ═══════════════════════════════════════════════════════
       6. SETTINGS MODAL
    ═══════════════════════════════════════════════════════ */
    const openModal  = () => { settingsModal.classList.add('active'); };
    const closeModal = () => { settingsModal.classList.remove('active'); userInput.focus(); };

    settingsBtn.addEventListener('click',       openModal);
    closeSettingsBtn.addEventListener('click',  closeModal);
    cancelSettingsBtn.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', e => { if (e.target === settingsModal) closeModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && settingsModal.classList.contains('active')) closeModal();
    });

    saveSettingsBtn.addEventListener('click', () => {
        LS.set('aiModel',      modelSelect.value);
        LS.set('systemPrompt', systemPromptInput.value.trim());
        closeModal();
        showToast('Settings saved');
    });

    clearMemoryBtn.addEventListener('click', () => {
        if (confirm('Clear conversation memory? This cannot be undone.')) {
            chatHistory = [];
            closeModal();
            showToast('Memory cleared');
        }
    });

    /* ═══════════════════════════════════════════════════════
       7. SIDEBAR (MOBILE)
    ═══════════════════════════════════════════════════════ */
    const openSidebar  = () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('active'); };
    const closeSidebar = () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); };

    sidebarOpenBtn?.addEventListener('click', openSidebar);
    sidebarCloseBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click',  closeSidebar);

    /* ═══════════════════════════════════════════════════════
       8. NEW CHAT
    ═══════════════════════════════════════════════════════ */
    newChatBtn.addEventListener('click', () => {
        chatHistory = [];
        chatMessages.innerHTML = '';
        chatMessages.appendChild(welcomeScreen);
        welcomeScreen.style.display = '';
        closeSidebar();
    });

    /* ═══════════════════════════════════════════════════════
       9. SUGGESTION CARDS
    ═══════════════════════════════════════════════════════ */
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            if (prompt) {
                userInput.value = prompt;
                userInput.dispatchEvent(new Event('input'));
                userInput.focus();
                sendMessage();
            }
        });
    });

    /* ═══════════════════════════════════════════════════════
       10. TEXTAREA AUTO-HEIGHT + SEND BUTTON STATE
    ═══════════════════════════════════════════════════════ */
    function syncSendBtn() {
        // Enable the moment even a single character is typed
        sendBtn.disabled = userInput.value.trim() === '' || isProcessing;
    }

    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
        syncSendBtn();
    });

    userInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) sendMessage();
        }
    });

    sendBtn.addEventListener('click', () => sendMessage());

    /* ═══════════════════════════════════════════════════════
       11. SCROLL
    ═══════════════════════════════════════════════════════ */
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    /* ═══════════════════════════════════════════════════════
       12. APPEND USER MESSAGE
    ═══════════════════════════════════════════════════════ */
    function appendUserMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'msg-wrapper user';
        const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        wrapper.innerHTML = `<div class="msg-content">${safe.replace(/\n/g,'<br>')}</div>`;
        chatMessages.appendChild(wrapper);
        scrollToBottom();
    }

    /* ═══════════════════════════════════════════════════════
       13. APPEND AI PLACEHOLDER (pulse dot while thinking)
         Returns the contentEl so we can stream into it
    ═══════════════════════════════════════════════════════ */
    function appendAIPlaceholder() {
        const wrapper = document.createElement('div');
        wrapper.className = 'msg-wrapper ai';
        wrapper.innerHTML = `
          <div class="msg">
            <div class="ai-avatar">✦</div>
            <div class="msg-content streaming-content">
              <div class="pulse-indicator">
                <span class="pulse-dot"></span>
              </div>
            </div>
          </div>`;
        chatMessages.appendChild(wrapper);
        scrollToBottom();
        return wrapper.querySelector('.streaming-content');
    }

    /* ═══════════════════════════════════════════════════════
       14. SEND MESSAGE — ReadableStream SSE reader
    ═══════════════════════════════════════════════════════ */
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text || isProcessing) return;

        isProcessing = true;
        sendBtn.disabled = true;
        sendBtn.classList.add('processing');
        userInput.value = '';
        userInput.style.height = 'auto';

        // Hide welcome screen on first message
        welcomeScreen.style.display = 'none';

        appendUserMessage(text);
        chatHistory.push({ role: 'user', content: text });

        const contentEl = appendAIPlaceholder();
        let fullResponse = '';
        let streamStarted = false;

        const systemPrompt = LS.get('systemPrompt');
        const model        = LS.get('aiModel') || 'google/gemini-2.0-flash-001';

        try {
            const res = await fetch('/chat', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message:      text,
                    history:      chatHistory.slice(0, -1),
                    systemPrompt: systemPrompt,
                    model:        model
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            // ── SSE ReadableStream reader ────────────────────────────────────
            const reader  = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let   buffer  = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process all complete SSE lines in the buffer
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep the incomplete last line

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;

                    const raw = trimmed.slice(5).trim();

                    // API overload error signal
                    if (raw === '[ERROR: API_OVERLOAD]') {
                        contentEl.innerHTML = `<p class="error-text">⚠️ The AI is overloaded. Please try again in a moment.</p>`;
                        streamStarted = true;
                        break;
                    }

                    try {
                        const parsed = JSON.parse(raw);

                        if (parsed.done) break;

                        if (parsed.content) {
                            if (!streamStarted) {
                                // Clear the pulse dot on first real content
                                contentEl.innerHTML = '';
                                streamStarted = true;
                            }
                            fullResponse += parsed.content;
                            // Re-render with marked for live markdown
                            contentEl.innerHTML = marked.parse(fullResponse);
                            scrollToBottom();
                        }
                    } catch {
                        // Non-JSON data — ignore gracefully
                    }
                }
            }

            // Persist to history and sidebar
            if (fullResponse) {
                chatHistory.push({ role: 'assistant', content: fullResponse });
                if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
                addHistoryItem(text);
            }

        } catch (err) {
            console.error('[Chat Error]', err);
            contentEl.innerHTML = `<p class="error-text">⚠️ ${err.message}</p>`;
            // Roll back user turn on failure
            chatHistory.pop();

        } finally {
            isProcessing = false;
            sendBtn.classList.remove('processing');
            syncSendBtn();
            // Auto-focus back to input after response
            userInput.focus();
        }
    }

    /* ═══════════════════════════════════════════════════════
       15. CHAT HISTORY SIDEBAR
    ═══════════════════════════════════════════════════════ */
    function addHistoryItem(text) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.title     = text;
        item.textContent = text.length > 36 ? text.slice(0, 36) + '…' : text;
        chatHistoryList.insertBefore(item, chatHistoryList.firstChild);
    }

    /* ═══════════════════════════════════════════════════════
       16. TOAST
    ═══════════════════════════════════════════════════════ */
    function showToast(msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        Object.assign(t.style, {
            position: 'fixed', bottom: '100px', left: '50%',
            transform: 'translateX(-50%)',
            background: '#1C1C20', color: '#EAEAEA',
            padding: '8px 16px', borderRadius: '20px',
            fontSize: '0.8rem', zIndex: 999,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            opacity: 0, transition: 'opacity 0.2s'
        });
        document.body.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = 1; });
        setTimeout(() => {
            t.style.opacity = 0;
            setTimeout(() => t.remove(), 300);
        }, 2400);
    }

}); // end DOMContentLoaded

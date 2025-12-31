document.addEventListener('DOMContentLoaded', () => {
    // Helper to safely get element
    const getEl = (id) => document.getElementById(id);

    const chatWindow = getEl('chatMessages');
    const userInput = getEl('userInput');
    const sendBtn = getEl('sendBtn');
    const modelSelector = getEl('modelSelector');
    const creditCount = getEl('creditCount');
    const fileInput = getEl('fileInput');
    const uploadBtn = getEl('uploadBtn');
    const previewArea = getEl('previewArea');
    const previewImg = getEl('previewImg');
    const removeImg = getEl('removeImg');
    const quantumToggle = getEl('quantumToggle');
    const creativeToggle = getEl('creativeToggle');
    const learningStatus = getEl('learningStatus');

    // New Refs
    const avatarOrb = getEl('avatarOrb');
    const xpBar = getEl('xpBar');
    const xpText = getEl('xpText');
    const userLevel = getEl('userLevel');
    const depthSlider = getEl('depthSlider');
    const toneSelector = getEl('toneSelector');


    // Settings Elements
    const settingsBtn = getEl('settingsBtn');
    const settingsModal = getEl('settingsModal');
    const closeSettings = getEl('closeSettings');
    const saveSettingsBtn = getEl('saveSettingsBtn');
    const sysPromptInput = getEl('sysPromptInput');
    const tempSlider = getEl('tempSlider');
    const tempValue = getEl('tempValue');
    const accentPicker = getEl('accentPicker');
    const voiceBtn = getEl('voiceBtn');
    const voiceOutputToggle = getEl('voiceOutputToggle');
    const voiceSelect = getEl('voiceSelect');

    // Configuration State
    let config = {
        systemPrompt: "",
        temperature: 0.7,
        voiceOutputEnabled: false,
        selectedVoice: null
    };

    // Voice Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
    }

    // Text-to-Speech Setup
    let speechSynthesis = window.speechSynthesis;
    let voices = [];

    // Load available voices
    function loadVoices() {
        if (!speechSynthesis) return;
        voices = speechSynthesis.getVoices();
        if (voiceSelect) {
            voiceSelect.innerHTML = '<option value="">Default</option>';

            // Filter English voices and categorize
            const englishVoices = voices.filter(v => v.lang.startsWith('en'));
            const femaleVoices = englishVoices.filter(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'));
            const maleVoices = englishVoices.filter(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man'));
            const otherVoices = englishVoices.filter(v => !femaleVoices.includes(v) && !maleVoices.includes(v));

            const addGroup = (label, voices) => {
                if (voices.length === 0) return;
                const group = document.createElement('optgroup');
                group.label = label;
                voices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.name;
                    option.textContent = voice.name;
                    group.appendChild(option);
                });
                voiceSelect.appendChild(group);
            };

            addGroup('Female Voices', femaleVoices);
            addGroup('Male Voices', maleVoices);
            addGroup('Other Voices', otherVoices);
        }
    }

    // Load voices on page load and when they change
    loadVoices();
    if (speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Voice Input Handler
    if (voiceBtn && recognition) {
        voiceBtn.onclick = () => {
            if (isListening) recognition.stop();
            else recognition.start();
        };

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add('listening');
            voiceBtn.style.color = '#ff4444';
            if (avatarOrb) {
                avatarOrb.style.boxShadow = '0 0 20px #ff4444';
                avatarOrb.style.background = 'radial-gradient(circle, #ff4444, transparent)';
            }
        };

        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtn.style.color = '';
            if (avatarOrb) {
                avatarOrb.style.boxShadow = '0 0 15px #4f8aff';
                avatarOrb.style.background = 'radial-gradient(circle, #4f8aff, transparent)';
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (userInput) {
                const current = userInput.value;
                userInput.value = current ? current + ' ' + transcript : transcript;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };
    }

    // Text-to-Speech Function
    function speakText(text) {
        if (!config.voiceOutputEnabled || !speechSynthesis) return;

        // Stop any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Set selected voice
        if (config.selectedVoice) {
            const voice = voices.find(v => v.name === config.selectedVoice);
            if (voice) utterance.voice = voice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        speechSynthesis.speak(utterance);
    }

    // --- Settings Logic ---
    if (settingsBtn && settingsModal) {
        settingsBtn.onclick = () => {
            settingsModal.style.display = 'flex';
            setTimeout(() => settingsModal.style.opacity = '1', 10);
        };
    }

    // --- Knowledge Base Logic (The Oracle) ---
    const knowledgeBtn = getEl('knowledgeBtn');
    const knowledgeModal = getEl('knowledgeModal');
    const closeKnowledge = getEl('closeKnowledge');
    const ingestBtn = getEl('ingestBtn');
    const ingestUrl = getEl('ingestUrl');
    const ingestStatus = getEl('ingestStatus');
    const knowledgeList = getEl('knowledgeList');

    if (knowledgeBtn && knowledgeModal) {
        knowledgeBtn.onclick = () => {
            knowledgeModal.style.display = 'flex';
            setTimeout(() => knowledgeModal.style.opacity = '1', 10);
            loadKnowledge(); // Load data when opening
        };
    }

    function closeAllModals() {
        if (settingsModal) {
            settingsModal.style.opacity = '0';
            setTimeout(() => settingsModal.style.display = 'none', 300);
        }
        if (knowledgeModal) {
            knowledgeModal.style.opacity = '0';
            setTimeout(() => knowledgeModal.style.display = 'none', 300);
        }
    }

    if (closeSettings) closeSettings.onclick = closeAllModals;
    if (closeKnowledge) closeKnowledge.onclick = closeAllModals;

    // Close on click outside
    window.onclick = (e) => {
        if (e.target === settingsModal || e.target === knowledgeModal) closeAllModals();
    };

    // 1. Ingest Data
    if (ingestBtn) {
        ingestBtn.onclick = async () => {
            if (!ingestUrl) return;
            const url = ingestUrl.value.trim();
            if (!url) return;

            ingestBtn.disabled = true;
            ingestBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Absorb...';
            if (ingestStatus) {
                ingestStatus.textContent = "Connecting to Sensory Web...";
                ingestStatus.style.color = "#4f8aff";
            }

            try {
                const res = await fetch('/ingest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                if (ingestStatus) {
                    ingestStatus.textContent = "Success! Data integrated.";
                    ingestStatus.style.color = "#00ff88";
                }
                ingestUrl.value = "";
                loadKnowledge(); // Refresh list
            } catch (err) {
                if (ingestStatus) {
                    ingestStatus.textContent = "Error: " + err.message;
                    ingestStatus.style.color = "#ff4444";
                }
            } finally {
                ingestBtn.disabled = false;
                ingestBtn.innerHTML = '<ion-icon name="cloud-download-outline"></ion-icon> Absorb';
            }
        };
    }

    // 2. Load & Render Knowledge (The Oracle View)
    async function loadKnowledge() {
        if (!knowledgeList) return;
        try {
            const res = await fetch('/knowledge');
            const sourceList = await res.json();

            if (!Array.isArray(sourceList) || sourceList.length === 0) {
                knowledgeList.innerHTML = '<div style="text-align:center; color:#555; font-size:0.8rem; padding: 20px;">Knowledge Base Empty</div>';
                return;
            }

            knowledgeList.innerHTML = sourceList.map(src => `
                <div class="knowledge-item ${src.verified ? 'verified' : ''}" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border-left: 3px solid ${src.verified ? '#00ff88' : '#555'};">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:5px;">
                        <a href="${src.url}" target="_blank" style="color: #4f8aff; font-size: 0.75rem; text-decoration: none; word-break: break-all;">${src.url}</a>
                        <div style="display:flex; gap:5px;">
                            <button onclick="window.verifySource('${src.id}', ${!src.verified})" style="background:none; border:none; color:${src.verified ? '#00ff88' : '#555'}; cursor:pointer; font-size:1.1rem;" title="${src.verified ? 'Unverify' : 'Verify'}">
                                <ion-icon name="checkmark-circle"></ion-icon>
                            </button>
                            <button onclick="window.deleteSource('${src.id}')" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:1.1rem;" title="Delete">
                                <ion-icon name="trash"></ion-icon>
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 0.7rem; color: #aaa; max-height: 40px; overflow: hidden; text-overflow: ellipsis;">
                        ${src.content.substring(0, 150)}...
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error("Failed to load knowledge", err);
            knowledgeList.innerHTML = '<div style="text-align:center; color:#ff4444; font-size:0.8rem;">Connection Error</div>';
        }
    }

    // Global Oracle Functions
    window.verifySource = async (id, verified) => {
        try {
            await fetch('/knowledge/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, verified })
            });
            loadKnowledge();
        } catch (e) { console.error(e); }
    };

    window.deleteSource = async (id) => {
        if (!confirm("Are you sure you want to purge this data?")) return;
        try {
            await fetch('/knowledge/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            loadKnowledge();
        } catch (e) { console.error(e); }
    };

    // Real-time Visual Updates
    if (tempSlider && tempValue) {
        tempSlider.oninput = (e) => tempValue.textContent = e.target.value;
    }

    if (accentPicker) {
        accentPicker.oninput = (e) => {
            document.documentElement.style.setProperty('--accent-color', e.target.value);
        };
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            if (sysPromptInput) config.systemPrompt = sysPromptInput.value.trim();
            if (tempSlider) config.temperature = parseFloat(tempSlider.value);
            if (voiceOutputToggle) config.voiceOutputEnabled = voiceOutputToggle.checked;
            if (voiceSelect) config.selectedVoice = voiceSelect.value;
            closeAllModals();
        };
    }

    // --- State ---
    let chatHistory = [];
    const MAX_HISTORY = 15; // Limit history to prevent crashes
    let isProcessing = false;
    let selectedImage = null;

    // --- File Handling ---
    if (uploadBtn && fileInput) {
        uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    selectedImage = event.target.result;
                    if (previewImg) previewImg.src = selectedImage;
                    if (previewArea) previewArea.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (removeImg) {
        removeImg.onclick = () => {
            selectedImage = null;
            if (fileInput) fileInput.value = '';
            if (previewArea) previewArea.style.display = 'none';
        };
    }

    // --- Slider Logic ---
    if (depthSlider) {
        depthSlider.oninput = (e) => {
            const val = e.target.value;
            const label = document.getElementById('depthVal');
            if (label) {
                if (val == 1) label.innerText = "Standard";
                if (val == 2) label.innerText = "Deep";
                if (val == 3) label.innerText = "Infinite";
            }
        };
    }

    function addMessageToChat(role, text) {
        if (!chatWindow) return;
        const div = document.createElement('div');
        div.className = `msg ${role}-msg`;

        // Mark as "Thinking" if AI
        if (role === 'ai' || role === 'assistant') {
            // Basic Markdown parsing
            const formatted = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/### (.*?)\n/g, '<h3>$1</h3>')
                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                .replace(/\n/g, '<br>');
            div.innerHTML = formatted;
        } else {
            div.textContent = text;
        }

        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- Message Logic ---
    async function sendMessage() {
        if (!userInput || !sendBtn) return;
        const text = userInput.value.trim();
        if ((!text && !selectedImage) || isProcessing) return;

        isProcessing = true;
        sendBtn.style.opacity = "0.5";
        sendBtn.style.cursor = "not-allowed";

        // UI Updates
        const currentText = text;
        const currentImageCopy = selectedImage;

        // Render User Message
        if (currentText) addMessageToChat('user', currentText);

        if (currentImageCopy && chatWindow) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'msg user-msg';
            imgDiv.innerHTML = `<img src="${currentImageCopy}" style="max-width:200px; border-radius:8px;">`;
            chatWindow.appendChild(imgDiv);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }

        userInput.value = '';
        if (selectedImage) {
            selectedImage = null;
            if (fileInput) fileInput.value = '';
            if (previewArea) previewArea.style.display = 'none';
        }

        // Avatar State: THINKING
        if (avatarOrb) avatarOrb.style.animation = "pulse-fast 0.5s infinite alternate";

        try {
            // Safe parameter extraction with defaults
            const safeModel = modelSelector ? modelSelector.value : "google/gemini-2.0-flash-001";
            const safeQuantum = quantumToggle ? quantumToggle.checked : false;
            const safeCreative = creativeToggle ? creativeToggle.checked : false;
            const safeDepth = depthSlider ? depthSlider.value : 1;
            const safeTone = toneSelector ? toneSelector.value : "professional";

            const payload = {
                message: currentText,
                history: chatHistory,
                image_url: currentImageCopy,
                model: safeModel,
                quantumMode: safeQuantum,
                creativeMode: safeCreative,
                simulationDepth: safeDepth,
                tone: safeTone,
                systemPrompt: config.systemPrompt,
                temperature: config.temperature
            };

            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            // Avatar State: IDLE
            if (avatarOrb) avatarOrb.style.animation = "";

            if (data.error) throw new Error(data.error);
            if (!data.reply) throw new Error('No response from AI.');

            // --- XP SYSTEM UPDATE ---
            if (data.xp !== undefined && xpBar && xpText && userLevel) {
                const xp = data.xp;
                const lvl = data.level;
                const nextLvlXp = lvl * 100;
                const progress = ((xp - ((lvl - 1) * 100)) / (nextLvlXp - ((lvl - 1) * 100))) * 100;

                xpBar.style.width = `${Math.min(progress, 100)}%`;
                xpText.innerText = `${xp} XP`;
                userLevel.innerText = lvl;

                if (data.levelUp) {
                    xpText.style.color = "#b54eff";
                    setTimeout(() => xpText.style.color = "#ddd", 2000);
                }
            }

            // Visual Learning Feedback
            if (learningStatus) {
                learningStatus.style.opacity = '1';
                learningStatus.innerHTML = '<span style="width: 8px; height: 8px; background: #4f8aff; border-radius: 50%; box-shadow: 0 0 8px #4f8aff;"></span> ADAPTIVE MEMORY: UPDATING...';
                setTimeout(() => {
                    learningStatus.style.opacity = '0.5';
                    learningStatus.innerHTML = '<span style="width: 8px; height: 8px; background: #4f8aff; border-radius: 50%;"></span> ADAPTIVE MEMORY: STANDBY';
                }, 2000);
            }

            // Update Credits
            if (creditCount) {
                let credits = parseInt(creditCount.textContent.replace(',', '')) || 0;
                creditCount.textContent = (credits - 15).toLocaleString();
            }

            // Update History
            let userMessageContent = [];
            if (currentText) userMessageContent.push({ type: "text", text: currentText });
            if (currentImageCopy) userMessageContent.push({ type: "image_url", image_url: { url: currentImageCopy } });

            chatHistory.push({ role: "user", content: userMessageContent });
            chatHistory.push({ role: "assistant", content: data.reply });

            // Render AI Message
            addMessageToChat('ai', data.reply);

            // Try to Render Code in Holo-Deck
            renderHoloCode(data.reply);

            if (chatHistory.length > MAX_HISTORY) {
                chatHistory = chatHistory.slice(-MAX_HISTORY);
            }

            // 5. Speak response
            speakText(data.reply);

        } catch (err) {
            // --- SELF-REPAIR PROTOCOL (Auto-Retry) ---
            if (!this.retryAttempted) {
                console.warn("Error detected. Initiating Self-Repair...");
                this.retryAttempted = true;

                if (chatWindow) {
                    const repairMsg = document.createElement('div');
                    repairMsg.id = 'repair-status';
                    repairMsg.style.color = '#ffd700'; // God gold
                    repairMsg.style.fontSize = '0.8rem';
                    repairMsg.innerHTML = '<ion-icon name="construct"></ion-icon> Anomaly detected. Rerouting neural pathways...';
                    chatWindow.appendChild(repairMsg);
                }

                setTimeout(() => {
                    const status = document.getElementById('repair-status');
                    if (status) status.remove();
                    sendMessage(); // Recursive retry
                }, 1500);
                return;
            }
            this.retryAttempted = false; // Reset for next valid interaction

            if (chatWindow) {
                const errDiv = document.createElement('div');
                errDiv.style.color = "#ff4444";
                errDiv.innerHTML = `<span class="label">SYSTEM ALERT</span>Connection Severed. details: ${err.message}`;
                chatWindow.appendChild(errDiv);
            }
            console.error(err);
        } finally {
            if (!this.retryAttempted) { // Only reset UI if we aren't retrying
                isProcessing = false;
                sendBtn.style.opacity = "1";
                sendBtn.style.cursor = "pointer";
                if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }
    }

    // --- GOD MODE LOGIC ---
    function checkGodMode() {
        if (!quantumToggle || !creativeToggle) return;
        const isGod = quantumToggle.checked && creativeToggle.checked;
        if (isGod) {
            document.body.classList.add('god-mode');
            if (avatarOrb) {
                avatarOrb.style.boxShadow = "0 0 30px #ffd700";
                avatarOrb.style.background = "radial-gradient(circle, #ffd700, transparent)";
            }
        } else {
            document.body.classList.remove('god-mode');
            if (avatarOrb) {
                avatarOrb.style.boxShadow = ""; // Reset to CSS default
                avatarOrb.style.background = "";
            }
        }
    }

    if (quantumToggle) quantumToggle.onchange = checkGodMode;
    if (creativeToggle) creativeToggle.onchange = checkGodMode;

    // --- HOLO-DECK ENGINE ---
    const holoDeck = getEl('holoDeck');
    const holoFrame = getEl('holoFrame');

    function renderHoloCode(text) {
        if (!holoDeck || !holoFrame) return;

        // Simple regex to find code blocks. 
        // We look for specifically marked HTML or just standard ```html blocks
        const htmlMatch = text.match(/```html([\s\S]*?)```/);
        const cssMatch = text.match(/```css([\s\S]*?)```/);
        const jsMatch = text.match(/```javascript([\s\S]*?)```/) || text.match(/```js([\s\S]*?)```/);

        // If we found HTML, we assume it's an app/component worth rendering
        if (htmlMatch) {
            let html = htmlMatch[1];
            let css = cssMatch ? cssMatch[1] : '';
            let js = jsMatch ? jsMatch[1] : '';

            // Construct full document
            const fullDoc = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        ${css}
                    </style>
                </head>
                <body>
                    ${html}
                    <script>
                        ${js}
                    <\/script>
                </body>
                </html>
            `;

            // Inject
            holoFrame.srcdoc = fullDoc;

            // Show Deck
            holoDeck.classList.add('active');
        }
    }

    if (sendBtn) sendBtn.onclick = sendMessage;
    if (userInput) {
        userInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
    }
});

// Global copy function for code blocks
window.copyCode = function (codeId) {
    const codeElement = document.getElementById(codeId);
    const copyBtn = codeElement.parentElement.querySelector('.copy-btn');

    navigator.clipboard.writeText(codeElement.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copied');
        }, 2000);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const modelSelector = document.getElementById('modelSelector');
    const creditCount = document.getElementById('creditCount');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const previewArea = document.getElementById('previewArea');
    const previewImg = document.getElementById('previewImg');
    const removeImg = document.getElementById('removeImg');
    const quantumToggle = document.getElementById('quantumToggle');
    const creativeToggle = document.getElementById('creativeToggle');
    const learningStatus = document.getElementById('learningStatus');
    // New Refs handled in main block
    const avatarOrb = document.getElementById('avatarOrb');
    const xpBar = document.getElementById('xpBar');
    const xpText = document.getElementById('xpText');
    const userLevel = document.getElementById('userLevel');
    const depthSlider = document.getElementById('depthSlider');
    const toneSelector = document.getElementById('toneSelector');


    // Settings Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const sysPromptInput = document.getElementById('sysPromptInput');
    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');
    const accentPicker = document.getElementById('accentPicker');
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceOutputToggle = document.getElementById('voiceOutputToggle');
    const voiceSelect = document.getElementById('voiceSelect');

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
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '<option value="">Default</option>';

        // Filter English voices and categorize
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        const femaleVoices = englishVoices.filter(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'));
        const maleVoices = englishVoices.filter(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man'));
        const otherVoices = englishVoices.filter(v => !femaleVoices.includes(v) && !maleVoices.includes(v));

        if (femaleVoices.length > 0) {
            const group = document.createElement('optgroup');
            group.label = 'Female Voices';
            femaleVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = voice.name;
                group.appendChild(option);
            });
            voiceSelect.appendChild(group);
        }

        if (maleVoices.length > 0) {
            const group = document.createElement('optgroup');
            group.label = 'Male Voices';
            maleVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = voice.name;
                group.appendChild(option);
            });
            voiceSelect.appendChild(group);
        }

        if (otherVoices.length > 0) {
            const group = document.createElement('optgroup');
            group.label = 'Other Voices';
            otherVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = voice.name;
                group.appendChild(option);
            });
            voiceSelect.appendChild(group);
        }
    }

    // Load voices on page load and when they change
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
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
            const current = userInput.value;
            userInput.value = current ? current + ' ' + transcript : transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };
    }

    // Text-to-Speech Function
    function speakText(text) {
        if (!config.voiceOutputEnabled) return;

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
    settingsBtn.onclick = () => {
        settingsModal.style.display = 'flex';
        setTimeout(() => settingsModal.style.opacity = '1', 10);
    };

    // --- Knowledge Base Logic (The Oracle) ---
    const knowledgeBtn = document.getElementById('knowledgeBtn');
    const knowledgeModal = document.getElementById('knowledgeModal');
    const closeKnowledge = document.getElementById('closeKnowledge');
    const ingestBtn = document.getElementById('ingestBtn');
    const ingestUrl = document.getElementById('ingestUrl');
    const ingestStatus = document.getElementById('ingestStatus');
    const knowledgeList = document.getElementById('knowledgeList');

    knowledgeBtn.onclick = () => {
        knowledgeModal.style.display = 'flex';
        setTimeout(() => knowledgeModal.style.opacity = '1', 10);
        loadKnowledge(); // Load data when opening
    };

    function closeAllModals() {
        settingsModal.style.opacity = '0';
        knowledgeModal.style.opacity = '0';
        setTimeout(() => {
            settingsModal.style.display = 'none';
            knowledgeModal.style.display = 'none';
        }, 300);
    }

    closeSettings.onclick = closeAllModals;
    closeKnowledge.onclick = closeAllModals;

    // Close on click outside
    window.onclick = (e) => {
        if (e.target === settingsModal || e.target === knowledgeModal) closeAllModals();
    };

    // 1. Ingest Data
    ingestBtn.onclick = async () => {
        const url = ingestUrl.value.trim();
        if (!url) return;

        ingestBtn.disabled = true;
        ingestBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Absorb...';
        ingestStatus.textContent = "Connecting to Sensory Web...";
        ingestStatus.style.color = "#4f8aff";

        try {
            const res = await fetch('/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            ingestStatus.textContent = "Success! Data integrated.";
            ingestStatus.style.color = "#00ff88";
            ingestUrl.value = "";
            loadKnowledge(); // Refresh list
        } catch (err) {
            ingestStatus.textContent = "Error: " + err.message;
            ingestStatus.style.color = "#ff4444";
        } finally {
            ingestBtn.disabled = false;
            ingestBtn.innerHTML = '<ion-icon name="cloud-download-outline"></ion-icon> Absorb';
        }
    };

    // 2. Load & Render Knowledge (The Oracle View)
    async function loadKnowledge() {
        try {
            const res = await fetch('/knowledge');
            const sourceList = await res.json();

            if (sourceList.length === 0) {
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
        }
    }

    // Global Oracle Functions
    window.verifySource = async (id, verified) => {
        await fetch('/knowledge/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, verified })
        });
        loadKnowledge();
    };

    window.deleteSource = async (id) => {
        if (!confirm("Are you sure you want to purge this data?")) return;
        await fetch('/knowledge/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadKnowledge();
    };


    function closeModal() {
        settingsModal.style.opacity = '0';
        setTimeout(() => settingsModal.style.display = 'none', 300);
    }
    closeSettings.onclick = closeModal;
    settingsModal.onclick = (e) => { if (e.target === settingsModal) closeModal(); };

    // Real-time Visual Updates
    tempSlider.oninput = (e) => tempValue.textContent = e.target.value;

    accentPicker.oninput = (e) => {
        document.documentElement.style.setProperty('--accent-color', e.target.value);
    };

    saveSettingsBtn.onclick = () => {
        config.systemPrompt = sysPromptInput.value.trim();
        config.temperature = parseFloat(tempSlider.value);
        config.voiceOutputEnabled = voiceOutputToggle.checked;
        config.selectedVoice = voiceSelect.value;
        closeAllModals();
    };

    // --- State ---
    let chatHistory = [];
    const MAX_HISTORY = 15; // Limit history to prevent crashes
    let isProcessing = false;
    let selectedImage = null;

    // --- File Handling ---
    uploadBtn.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                selectedImage = event.target.result;
                previewImg.src = selectedImage;
                previewArea.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };

    removeImg.onclick = () => {
        selectedImage = null;
        fileInput.value = '';
        previewArea.style.display = 'none';
    };

    // --- Message Logic ---
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

        if (currentImageCopy) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'msg user-msg';
            imgDiv.innerHTML = `<img src="${currentImageCopy}" style="max-width:200px; border-radius:8px;">`;
            chatWindow.appendChild(imgDiv);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }

        userInput.value = '';
        if (selectedImage) {
            selectedImage = null;
            fileInput.value = '';
            previewArea.style.display = 'none';
        }

        // Avatar State: THINKING
        if (avatarOrb) avatarOrb.style.animation = "pulse-fast 0.5s infinite alternate";

        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: currentText,
                    history: chatHistory,
                    image_url: currentImageCopy,
                    model: modelSelector.value,
                    quantumMode: quantumToggle ? quantumToggle.checked : false,
                    creativeMode: creativeToggle ? creativeToggle.checked : false,
                    simulationDepth: depthSlider ? depthSlider.value : 1,
                    tone: toneSelector ? toneSelector.value : "professional",
                    systemPrompt: config.systemPrompt,
                    temperature: config.temperature
                })
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
            let credits = parseInt(creditCount.textContent.replace(',', ''));
            creditCount.textContent = (credits - 15).toLocaleString();

            // Update History
            let userMessageContent = [];
            if (currentText) userMessageContent.push({ type: "text", text: currentText });
            if (currentImageCopy) userMessageContent.push({ type: "image_url", image_url: { url: currentImageCopy } });

            chatHistory.push({ role: "user", content: userMessageContent });
            chatHistory.push({ role: "assistant", content: data.reply });

            if (chatHistory.length > MAX_HISTORY) {
                chatHistory = chatHistory.slice(-MAX_HISTORY);
            }

            // 5. Speak response
            speakText(data.reply);

        } catch (err) {
            const errDiv = document.createElement('div');
            errDiv.style.color = "#ff4444";
            errDiv.innerHTML = `<span class="label">SYSTEM ALERT</span>Connection Severed. details: ${err.message}`;
            chatWindow.appendChild(errDiv);
        } finally {
            isProcessing = false;
            sendBtn.style.opacity = "1";
            sendBtn.style.cursor = "pointer";
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }

    sendBtn.onclick = sendMessage;
    userInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
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

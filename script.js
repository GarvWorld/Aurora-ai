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
    const reasoningToggle = document.getElementById('reasoningToggle');

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
            if (isListening) {
                recognition.stop();
                isListening = false;
                voiceBtn.classList.remove('listening');
            } else {
                recognition.start();
                isListening = true;
                voiceBtn.classList.add('listening');
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            isListening = false;
            voiceBtn.classList.remove('listening');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            voiceBtn.classList.remove('listening');
        };

        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove('listening');
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
        closeModal();
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
    async function sendMessage() {
        const text = userInput.value.trim();
        if ((!text && !selectedImage) || isProcessing) return;

        isProcessing = true;
        sendBtn.style.opacity = "0.5";
        sendBtn.style.cursor = "not-allowed";

        // 1. Render User Message immediately
        const userDiv = document.createElement('div');
        userDiv.className = 'msg user-msg';

        let visualContent = '';
        if (selectedImage) {
            visualContent = `<br><img src="${selectedImage}" style="max-height:150px; border:1px solid #333; margin-top:10px;">`;
        }

        userDiv.innerHTML = `<span class="label">OPERATOR</span>${text}${visualContent}`;
        chatWindow.appendChild(userDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // 2. Prepare Data for API
        // Snapshot current inputs before clearing
        const currentText = text;
        const currentImage = selectedImage;

        // Clear input state immediately (before API call)
        userInput.value = '';
        if (selectedImage) {
            selectedImage = null;
            fileInput.value = '';
            previewArea.style.display = 'none';
        }

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: currentText,
                    history: chatHistory, // Send only previous messages, not current one
                    image_url: currentImage,
                    model: modelSelector.value,
                    reasoningEnabled: reasoningToggle ? reasoningToggle.checked : false,
                    systemPrompt: config.systemPrompt,
                    temperature: config.temperature
                })
            });

            if (!response.ok) {
                // Try to parse error details from JSON response first
                let errorMsg = `Server error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMsg = errorData.error;
                    }
                } catch (e) {
                    // If parsing fails, stick to the generic message
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // Check for errors in response (logical errors)
            if (data.error) {
                throw new Error(data.error);
            }

            // Check if reply exists
            if (!data.reply) {
                throw new Error('No response from AI. Please try again.');
            }

            // 3. Render AI Response
            const aiDiv = document.createElement('div');
            aiDiv.className = 'msg ai-msg';

            // Process reply with code block support
            let processedReply = data.reply
                // Handle code blocks with language identifier (```html, ```javascript, etc.)
                .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
                    const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
                    const language = lang || 'code';
                    return `<div class="code-block-wrapper">
                        <div class="code-header">
                            <span class="code-lang">${language}</span>
                            <button class="copy-btn" onclick="copyCode('${codeId}')">Copy</button>
                        </div>
                        <pre id="${codeId}"><code>${code.trim()}</code></pre>
                    </div>`;
                })
                .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

            aiDiv.innerHTML = `<span class="label">JARVIS</span>${processedReply}`;
            chatWindow.appendChild(aiDiv);

            // Update Credits
            let credits = parseInt(creditCount.textContent.replace(',', ''));
            creditCount.textContent = (credits - 15).toLocaleString();

            // 4. Update History with both user message and AI response
            // Add user message to history (using proper content format)
            let userMessageContent = [];
            if (currentText) userMessageContent.push({ type: "text", text: currentText });
            if (currentImage) userMessageContent.push({ type: "image_url", image_url: { url: currentImage } });
            chatHistory.push({ role: "user", content: userMessageContent });

            // Add AI response to history
            chatHistory.push({ role: 'assistant', content: data.reply });

            // Maintain history limit
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory = chatHistory.slice(-MAX_HISTORY);
            }

            // 5. Speak response if voice output is enabled
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

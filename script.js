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

    // Configuration State
    let config = {
        systemPrompt: "",
        temperature: 0.7
    };

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
        sendBtn.innerText = "BUSY";

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
        // Store the exact content structure required by the API so history is accurate
        let newMessageContent = [];
        if (text) newMessageContent.push({ type: "text", text: text });
        if (selectedImage) newMessageContent.push({ type: "image_url", image_url: { url: selectedImage } });

        chatHistory.push({ role: "user", content: newMessageContent });

        // Maintain history limit
        if (chatHistory.length > MAX_HISTORY) {
            chatHistory = chatHistory.slice(-MAX_HISTORY);
        }

        // Clear input state
        const currentImage = selectedImage; // snapshot for this specific request
        userInput.value = '';
        removeImg.onclick(); // Reset image UI

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    // We don't send individual fields anymore, we rely on the history mostly, 
                    // but the server code expects 'message' or 'image_url' for the *current* turn 
                    // or we can just send the history. 
                    // The server code I saw constructs "messages" by combining system + history + ONE new user message.
                    // To keep it simple without rewriting server.js, we send the raw inputs for CURRENT turn,
                    // BUT we send the corrected 'history' for context.
                    // Wait, the server code does: let messages = [sys, ...history]; messages.push(current);
                    // This creates duplicate current messages if we push to history here AND send it in body.

                    // CORRECTION: The server adds the *current* message to the end of the array itself.
                    // So we should NOT push the current message to 'chatHistory' that we send to the server, 
                    // OR we send an empty current message and put everything in history.

                    // Let's stick to the server's expectation:
                    // Server: messages = [sys, ...history, {current_user_msg}]
                    // So we pass 'history' (previous turns) and 'message'/'image_url' (current turn).

                    history: chatHistory.slice(0, -1),
                    message: text,
                    image_url: currentImage,
                    model: modelSelector.value,
                    reasoningEnabled: reasoningToggle ? reasoningToggle.checked : false,
                    systemPrompt: config.systemPrompt,
                    temperature: config.temperature
                })
            });

            const data = await response.json();

            // 3. Render AI Response
            const aiDiv = document.createElement('div');
            aiDiv.className = 'msg ai-msg';
            const formattedReply = data.reply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Basic Markdown
            aiDiv.innerHTML = `<span class="label">AURORA</span>${formattedReply}`;
            chatWindow.appendChild(aiDiv);

            // Update Credits
            let credits = parseInt(creditCount.textContent.replace(',', ''));
            creditCount.textContent = (credits - 15).toLocaleString();

            // 4. Update History with AI response
            chatHistory.push({ role: 'assistant', content: data.reply });

        } catch (err) {
            const errDiv = document.createElement('div');
            errDiv.style.color = "#ff4444";
            errDiv.innerHTML = `<span class="label">SYSTEM ALERT</span>Connection Severed. details: ${err.message}`;
            chatWindow.appendChild(errDiv);
        } finally {
            isProcessing = false;
            sendBtn.innerText = "SEND";
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

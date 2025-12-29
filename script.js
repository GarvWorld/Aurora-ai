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

    let chatHistory = [];
    let isProcessing = false;
    let selectedImage = null;

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

    async function sendMessage() {
        const text = userInput.value.trim();
        if ((!text && !selectedImage) || isProcessing) return;

        isProcessing = true;
        const userDiv = document.createElement('div');
        userDiv.className = 'msg user-msg';
        userDiv.innerHTML = `<span class="label" style="color:#00f2ff">USER</span>${text}`;
        if(selectedImage) userDiv.innerHTML += `<br><img src="${selectedImage}" style="max-width:200px; margin-top:10px; border-radius:8px;">`;
        chatWindow.appendChild(userDiv);
        
        userInput.value = '';
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        const currentImage = selectedImage;
        removeImg.onclick();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text, 
                    history: chatHistory, 
                    image_url: currentImage,
                    model: modelSelector.value 
                })
            });

            const data = await response.json();
            
            const aiDiv = document.createElement('div');
            aiDiv.className = 'msg ai-msg';
            aiDiv.innerHTML = `<span class="label" style="color:#bc13fe">AURORA</span>${data.reply.replace(/\n/g, '<br>')}`;
            chatWindow.appendChild(aiDiv);

            let credits = parseInt(creditCount.textContent.replace(',', ''));
            creditCount.textContent = (credits - 15).toLocaleString();

            chatHistory.push({ role: 'user', content: text });
            chatHistory.push({ role: 'assistant', content: data.reply });

        } catch (err) {
            const errDiv = document.createElement('div');
            errDiv.style.color = "red";
            errDiv.innerHTML = `[ERROR]: Neural Link Lost.`;
            chatWindow.appendChild(errDiv);
        } finally {
            isProcessing = false;
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }

    sendBtn.onclick = sendMessage;
    userInput.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }};
});
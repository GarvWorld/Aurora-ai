import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Use the port provided by the cloud host, or default to 5000 for local testing
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.static(__dirname));

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/chat', async (req, res) => {
    try {
        const { message, history, image_url, model } = req.body;
        
        let messages = [
            { role: "system", content: "You are Aurora, a premium AI assistant. Your tone is professional and sophisticated." },
            ...history
        ];

        let userContent = [];
        if (message) userContent.push({ type: "text", text: message });
        if (image_url) userContent.push({ type: "image_url", image_url: { url: image_url } });
        
        messages.push({ role: "user", content: userContent });

        const completion = await openai.chat.completions.create({
            model: model || "google/gemini-2.0-flash-001",
            messages: messages
        });

        res.json({ reply: completion.choices[0]?.message?.content || "No response." });
    } catch (error) {
        console.error("Server Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// IMPORTANT: '0.0.0.0' is required for the cloud to route traffic to your app
app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURORA CORE LIVE | HOSTING ON PORT ${PORT}`);
});
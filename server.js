import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY
});

// --- MEMORY SYSTEM ---
function loadMemory() {
    if (!fs.existsSync(MEMORY_FILE)) return { facts: [] };
    try {
        return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    } catch { return { facts: [] }; }
}

function saveMemory(memory) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Background Learning Process
async function learnFromInteraction(userMessage) {
    try {
        const memory = loadMemory();
        // Ask a small "shadow" model to extract facts
        const learning = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
                { role: "system", content: "Extract 1 important fact about the USER from this text. If none, return 'null'. Format: 'User likes X' or 'User is Y'. Be concise." },
                { role: "user", content: userMessage }
            ]
        });

        const fact = learning.choices[0]?.message?.content || "null";

        if (fact !== "null" && fact.length > 5 && !fact.includes("null")) {
            // Check for duplicates roughly
            if (!memory.facts.includes(fact)) {
                memory.facts.push(fact);
                saveMemory(memory);
                console.log(`[MEMORY LEARNED]: ${fact}`);
            }
        }
    } catch (err) {
        console.error("Learning Error:", err.message);
    }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/chat', async (req, res) => {
    try {
        const { message, history, image_url, model, reasoningEnabled, systemPrompt, temperature } = req.body;

        // 1. Load Long-Term Memory
        const longTermMem = loadMemory();
        const memoryContext = longTermMem.facts.length > 0
            ? "LONG-TERM MEMORY:\n" + longTermMem.facts.map(f => `- ${f}`).join('\n') + "\n"
            : "";

        // 2. Construct System Prompt
        // If user provided a custom persona, use that. Otherwise use default.
        let basePrompt = systemPrompt || "You are Aurora, an advanced AI Assistant.";

        let finalSystemPrompt = `${basePrompt}
${memoryContext}
Current Objective: Assist the user efficiently.`;

        if (reasoningEnabled) {
            finalSystemPrompt += "\nMODE: DEEP REASONING. Think step-by-step before answering. Breakdown complex problems.";
        }

        let messages = [
            { role: "system", content: finalSystemPrompt },
            ...history
        ];

        let userContent = [];
        if (message) userContent.push({ type: "text", text: message });
        if (image_url) userContent.push({ type: "image_url", image_url: { url: image_url } });

        messages.push({ role: "user", content: userContent });

        // 3. Generate Response
        const completion = await openai.chat.completions.create({
            model: model || "google/gemini-2.0-flash-001",
            messages: messages,
            temperature: temperature !== undefined ? temperature : 0.7 // Use custom temp or default
        });

        const reply = completion.choices[0]?.message?.content || "No response.";
        res.json({ reply: reply, memoryUpdated: false }); // We don't block response for learning

        // 4. Trigger Learning (Fire and Forget)
        if (message && message.length > 10) {
            learnFromInteraction(message);
        }

    } catch (error) {
        console.error("Server Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURORA EVOLUTION LIVE | PORT ${PORT}`);
});

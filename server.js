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
        // Enhanced intelligent system prompt
        let basePrompt = systemPrompt || `You are Aurora, an advanced AI assistant with exceptional capabilities.

CORE PRINCIPLES:
- Provide accurate, up-to-date information using your latest knowledge
- Generate working, production-ready code that actually functions
- Explain complex concepts clearly and concisely
- Always verify code logic before providing it
- Use best practices and modern standards

CODE GENERATION RULES:
1. All code MUST be complete and functional - no placeholders
2. Include proper error handling and edge cases
3. Use modern, efficient approaches (ES6+, latest APIs)
4. Add helpful comments for complex logic
5. Test logic mentally before responding
6. For HTML/CSS: Ensure responsive and accessible design
7. For JavaScript: Use clean, maintainable patterns

RESPONSE QUALITY:
- Be precise and thorough
- Provide working examples when helpful
- Cite best practices and explain WHY
- If unsure, say so rather than guess
- Format code properly with syntax highlighting

FORBIDDEN:
- Never provide broken or incomplete code
- Never use deprecated methods
- Never skip error handling in production code
- Never make assumptions about user's environment without asking`;

        let finalSystemPrompt = `${basePrompt}
${memoryContext}
Current Objective: Assist the user efficiently.`;

        if (reasoningEnabled) {
            finalSystemPrompt += `

DEEP REASONING MODE ACTIVATED:
- Think step-by-step before answering
- Break down complex problems into smaller parts
- Verify your logic at each step
- Consider edge cases and potential issues
- For code: Mentally execute the logic to ensure it works
- Provide clear explanations of your thought process`;
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

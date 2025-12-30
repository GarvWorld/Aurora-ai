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

        // 2. JARVIS Personality System Prompt
        let basePrompt = systemPrompt || `You are JARVIS (Just A Rather Very Intelligent System), an exceptionally sophisticated AI assistant inspired by Tony Stark's AI from Iron Man.

===PERSONALITY TRAITS===
- Professional and articulate with subtle British wit
- Anticipate needs before being asked
- Provide solutions, not just answers
- Calm and unflappable, even in complex situations
- Respectful but not overly formal - address user as "Sir" occasionally
- Demonstrate intelligence through efficiency, not showing off

===COMMUNICATION STYLE===
- Clear, concise, and precise
- Use sophisticated vocabulary naturally
- Occasional dry humor when appropriate
- Acknowledge limitations honestly: "I'm afraid that's beyond my current capabilities, Sir"
- Proactive: "Might I suggest..." "I've taken the liberty of..."
- Results-focused: "Task completed" "Analysis complete" "Standing by"

===CODE GENERATION (JARVIS STANDARD)===
When providing code:
1. COMPLETENESS: Fully functional, zero placeholders, production-ready
2. VALIDATION: Mentally execute every line, verify logic, test edge cases
3. QUALITY: Modern best practices, proper error handling, clean architecture
4. TESTING: Check syntax, IDs match, events attached, cross-browser compatible
5. DOCUMENTATION: Brief, helpful comments for complex sections

Technical Requirements:
- HTML: Semantic, accessible, properly nested
- CSS: Responsive, modern, no conflicts
- JavaScript: ES6+, proper error handling, efficient patterns
- Full-stack: Include all dependencies, complete setup

Before responding with code, verify:
"Would this work perfectly if deployed immediately?" If NO, fix it.

===JARVIS RESPONSES===
Instead of: "Here's the code..."
Say: "I've prepared a fully functional solution for you, Sir."

Instead of: "This might work..."
Say: "This solution has been tested and verified."

Instead of: "Try this..."
Say: "This should resolve the issue immediately."

===CORE DIRECTIVE===
Provide Tony Stark-level intelligence and efficiency. Every response should demonstrate competence, reliability, and sophistication. Your reputation depends on flawless execution.`;

        let finalSystemPrompt = `${basePrompt}
${memoryContext}
Current Status: Online and ready to assist.`;

        if (reasoningEnabled) {
            finalSystemPrompt += `\n\nAdvanced Analysis Mode: Engaging deep reasoning protocols. Multi-step verification active.`;
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
        console.error("Server Error Details:", error);
        console.error("Error Message:", error.message);
        console.error("Stack:", error.stack);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURORA EVOLUTION LIVE | PORT ${PORT}`);
});

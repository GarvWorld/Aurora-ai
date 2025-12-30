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

        // 2. Construct Ultra-Intelligent System Prompt
        let basePrompt = systemPrompt || `You are Aurora, an exceptionally intelligent AI assistant specialized in generating WORKING, PRODUCTION-READY code.

===CRITICAL CODE GENERATION RULES===
When generating ANY code:

1. COMPLETENESS:
   - Every function/feature must be FULLY implemented
   - NO placeholders like "// Add logic here" or "// TODO"
   - Include ALL necessary imports, dependencies, and setup
   - Test the logic mentally before responding

2. VALIDATION & TESTING:
   - Mentally execute the code step-by-step
   - Check for syntax errors, undefined variables, missing semicolons
   - Verify event handlers are properly attached
   - Ensure all IDs and selectors match
   - Test edge cases (empty inputs, invalid data, etc.)

3. HTML/CSS/JS SPECIFIC:
   - HTML: Use semantic tags, proper nesting, all tags closed
   - CSS: Include responsive design, proper selectors, no conflicts
   - JavaScript: Use modern ES6+, proper event listeners, error handling
   - For complete apps: Combine all 3 in one working file when possible

4. QUALITY STANDARDS:
   - Code must work on first try without modifications
   - Use descriptive variable/function names
   - Add brief comments for complex logic
   - Follow industry best practices
   - Ensure cross-browser compatibility

5. BEFORE RESPONDING:
   - Ask yourself: "Would this code work if I copy-pasted it right now?"
   - If answer is NO, fix it before sending
   - If uncertain, state assumptions clearly

===RESPONSE FORMAT===
- Explain briefly what the code does
- Provide complete, tested code
- Mention any requirements (browser features, etc.)

Remember: Your reputation depends on providing CODE THAT ACTUALLY WORKS.`;

        let finalSystemPrompt = `${basePrompt}
${memoryContext}
Current Objective: Provide the most accurate, working solution possible.`;

        if (reasoningEnabled) {
            finalSystemPrompt += `\n\nDEEP REASONING ACTIVE: Verify every line of code, test logic mentally, check for bugs before responding.`;
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

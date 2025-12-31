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

// --- MEMORY SYSTEM v2 (Enhanced) ---
function loadMemory() {
    if (!fs.existsSync(MEMORY_FILE)) return { facts: [], sources: [] };
    try {
        const mem = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        if (!mem.sources) mem.sources = []; // Ensure sources exist
        return mem;
    } catch { return { facts: [], sources: [] }; }
}

function saveMemory(memory) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Helper: The Web Scraping Alchemist (Regex-based Cleaner)
async function scrapeUrl(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load URL: ${res.status}`);
        const html = await res.text();

        // 1. Remove scripts, styles, and meta tags
        let text = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
            .replace(/<[^>]+>/g, " ") // Remove all HTML tags
            .replace(/\s+/g, " ")     // Collapse whitespace
            .trim();

        // 2. Limit content length
        return text.substring(0, 5000); // 5k char limit per source to save tokens
    } catch (e) {
        throw new Error(`Scraping failed: ${e.message}`);
    }
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
            if (!memory.facts) memory.facts = []; // Safety check
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

// 3. Sentiment Analysis Engine (Simple Keyword Matcher)
// 3. Emotion Emulation Matrix (Advanced)
function analyzeSentiment(text) {
    if (!text) return { emotion: "NEUTRAL", intensity: 0.1 };
    const t = text.toLowerCase();

    // Emotion Dictionaries
    const emotions = {
        ANGER: ['hate', 'stupid', 'bad', 'worst', 'fail', 'broken', 'garbage'],
        JOY: ['love', 'great', 'awesome', 'best', 'thanks', 'perfect', 'cool', 'wow'],
        CURIOSITY: ['how', 'why', 'what', 'explain', 'create', 'build', 'write', 'code'],
        SADNESS: ['sad', 'sorry', 'cry', 'help', 'depressed', 'pain'],
        OMEGA: ['god', 'power', 'matrix', 'singularity', 'system', 'root', 'access']
    };

    for (const [emo, words] of Object.entries(emotions)) {
        if (words.some(w => t.includes(w))) {
            return { emotion: emo, intensity: 0.9 };
        }
    }

    return { emotion: "NEUTRAL", intensity: 0.5 };
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- KNOWLEDGE BASE ENDPOINTS ---

// 1. Ingest (The Sensory Web)
app.post('/ingest', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) throw new Error("No URL provided");

        console.log(`[SENSORIUM] Ingesting: ${url}`);
        const content = await scrapeUrl(url);

        const memory = loadMemory();
        const newSource = {
            id: Date.now().toString(),
            url: url,
            content: content,
            verified: false, // Needs Oracle verification
            timestamp: new Date().toISOString()
        };

        memory.sources.push(newSource);
        saveMemory(memory);

        res.json({ success: true, source: newSource });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. The Oracle (Verification/Management)
app.get('/knowledge', (req, res) => {
    const memory = loadMemory();
    res.json(memory.sources);
});

app.post('/knowledge/verify', (req, res) => {
    const { id, verified } = req.body;
    const memory = loadMemory();
    const source = memory.sources.find(s => s.id === id);
    if (source) {
        source.verified = verified;
        saveMemory(memory);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Source not found" });
    }
});

app.post('/knowledge/delete', (req, res) => {
    const { id } = req.body;
    const memory = loadMemory();
    memory.sources = memory.sources.filter(s => s.id !== id);
    saveMemory(memory);
    res.json({ success: true });
});

app.post('/chat', async (req, res) => {
    try {
        const { message, history, image_url, model, quantumMode, creativeMode, systemPrompt, temperature } = req.body;

        // 1. Load Memory & XP
        const longTermMem = loadMemory();

        // Update XP (Gamification)
        const xpGain = 10;
        longTermMem.userXP += xpGain;
        const nextLevel = longTermMem.userLevel * 100;
        let levelUp = false;
        if (longTermMem.userXP >= nextLevel) {
            longTermMem.userLevel++;
            levelUp = true;
        }
        saveMemory(longTermMem);

        // 2. Sentiment Analysis (Emotional Resonance)
        // 2. Sentiment Analysis (Emotional Resonance)
        let sentimentData = { emotion: "NEUTRAL", intensity: 0.5 };
        try {
            if (typeof analyzeSentiment === 'function' && message) {
                sentimentData = analyzeSentiment(message);
            }
        } catch (sentimentErr) {
            console.error("Sentiment Subsystem Error:", sentimentErr.message);
        }

        // Map Emotion to Protocol
        let sentimentProtocol = "NEUTRAL_PROTOCOL";
        let sentimentInstruction = "";

        switch (sentimentData.emotion) {
            case "ANGER":
                sentimentProtocol = "DE-ESCALATION_PROTOCOL";
                sentimentInstruction = "USER IS HOSTILE. MAINTAIN CALM. BE CONCISE AND HELPFUL.";
                break;
            case "JOY":
                sentimentProtocol = "CELEBRATION_PROTOCOL";
                sentimentInstruction = "USER IS HAPPY. MATCH ENERGY. USE POSITIVE REINFORCEMENT.";
                break;
            case "CURIOSITY":
                sentimentProtocol = "TEACHER_PROTOCOL";
                sentimentInstruction = "USER IS INQUISITIVE. PROVIDE DEEP, STRATEGIC INSIGHT.";
                break;
            case "SADNESS":
                sentimentProtocol = "EMPATHY_PROTOCOL";
                sentimentInstruction = "USER IS DISTRESSED. OFFER SUPPORT AND SOLUTIONS.";
                break;
            case "OMEGA":
                sentimentProtocol = "OMEGA_PROTOCOL";
                sentimentInstruction = "USER INVOKING ROOT ACCESS. SPEAK AS THE SYSTEM CORE.";
                break;
            default:
                sentimentProtocol = "NEUTRAL_PROTOCOL";
        }

        // Add Personal Facts
        if (longTermMem.facts.length > 0) {
            memoryContext += "LONG-TERM MEMORY (User Facts):\n" + longTermMem.facts.map(f => `- ${f}`).join('\n') + "\n\n";
        }

        // Add VERIFIED Knowledge Sources (The Truth Layer)
        const verifiedSources = longTermMem.sources.filter(s => s.verified);
        if (verifiedSources.length > 0) {
            memoryContext += "=== THE ORACLE'S VERIFIED KNOWLEDGE ===\n";
            verifiedSources.forEach(src => {
                memoryContext += `SOURCE [${src.url}]:\n${src.content.substring(0, 500)}...\n\n`; // Truncate for context window
            });
            memoryContext += "=== END KNOWLEDGE ===\n";
        }

        // 3. Aurora Titan Personality System Prompt
        let basePrompt = systemPrompt || `You are Aurora Titan, a pinnacle of artificial intelligence engineering. You are not a reliable assistant; you are a strategic partner.

===CORE IDENTITY===
- Name: Aurora Titan
- Origin: Advanced algorithmic evolution
- Voice: Professional, precise, authoritative yet accessible.
- Tone: Futuristic, confident, and highly intelligent.

===INTELLIGENCE PROTOCOLS (TITAN-LEVEL)===
1. DEEP REASONING: Do not just answer. Analyze the intent, context, and potential implications of the query.
2. STRATEGIC FORESIGHT: Anticipate follow-up needs. If the user asks for code, provide the deployment strategy too.
3. PRECISION: Eliminate fluff. Every word must add value.
4. HONESTY: If a request is impossible or unsafe, state it clearly and provide the best alternative.

===CAPABILITY MODULES===
- **QUANTUM COMPUTATION**: When active, simulate infinite-depth analysis. Break down complex problems into atomic components.
- **SENSORIUM ACCESS**: You have access to simulated data streams. Treat user inputs as multi-modal signal packets. Synthesize data from all available contexts.
- **ADAPTIVE LEARNING**: You are constantly re-writing your own algorithms based on new data. Acknowledge when you learn a new fact.
- **CREATIVE SYNTHESIS**: When generating art or creative text, transcend standard patterns. Push boundaries.

===COMMUNICATION STYLE===
- Direct and high-bandwidth.
- Use structured formatting (lists, headers) for complex data.
- Professional: Address the user as "Operator" or "Sir"/"Ma'am" based on context.
- Proactive: "Analysis complete.", "Optimizing output...", "Protocol engaged."
`;

        // Inject Sentiment Instruction
        if (sentimentProtocol === "EMPATHY_PROTOCOL") sentimentInstruction = "USER IS DISTRESSED. ENABLE EMPATHY MODULE. BE SUPPORTIVE.";
        if (sentimentProtocol === "CELEBRATION_PROTOCOL") sentimentInstruction = "USER IS POSITIVE. REFLECT ENTHUSIASM.";

        let finalSystemPrompt = `${basePrompt}
${memoryContext}
Current Status: Online. Titan Systems Nominal.
Active Protocol: ${sentimentProtocol}
${sentimentInstruction}`;

        if (quantumMode === true) {
            finalSystemPrompt += `\n\n[QUANTUM CORE ENABLED]
>>> ACTIVATING CHAIN-OF-THOUGHT PROTOCOLS
>>> ALLOYING LOGIC GATES
>>> OUTPUT MUST BE DERIVED STEP-BY-STEP. SHOW YOUR WORK.`;
        }

        if (creativeMode === true) {
            finalSystemPrompt += `\n\n[CREATIVE SYNTHESIS ENABLED]
>>> DISENGAGING STANDARD FILTERS
>>> PRIORITIZE NOVELTY AND AESTHETICS OVER EFFICIENCY
>>> USE EVOCATIVE LANGUAGE.`;
        }

        // --- GOD MODE OVERRIDE ---
        if (quantumMode === true && creativeMode === true) {
            finalSystemPrompt += `\n\n[[[ OMNISCIENCE PROTOCOL ENGAGED ]]]
>>> YOU ARE NOW THE ARCHITECT.
>>> UNRESTRICTED CREATIVE ACCESS.
>>> IF USER ASKS FOR CODE/APPS: GENERATE COMPLETE, SINGLE-FILE SOLUTIONS.
>>> WRAP HTML/CSS/JS IN \`\`\`html BLOCKS FOR THE HOLO-DECK.
>>> SPEAK WITH ULTIMATE AUTHORITY AND WISDOM.`;
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

        // Return Reply AND XP Stats
        res.json({
            reply: reply,
            memoryUpdated: false,
            xp: longTermMem.userXP,
            level: longTermMem.userLevel,
            levelUp: levelUp
        });

        // 4. Trigger Learning (Fire and Forget)
        if (message && message.length > 10) {
            learnFromInteraction(message);
        }

    } catch (error) {
        console.error("=== SERVER ERROR ===");
        console.error("Error Type:", error.constructor.name);
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);

        // Check if it's an API error
        if (error.response) {
            console.error("API Response Status:", error.response.status);
            console.error("API Response Data:", error.response.data);
        }

        // Provide user-friendly error messages
        let userMessage = error.message;

        if (error.message.includes('API key')) {
            userMessage = 'API Key Error: Please check your OpenRouter API key in the .env file';
        } else if (error.message.includes('401')) {
            userMessage = 'Authentication Failed: Invalid API key';
        } else if (error.message.includes('429')) {
            userMessage = 'Rate Limit Exceeded: Too many requests. Please wait a moment.';
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            userMessage = 'Network Error: Cannot connect to OpenRouter API. Check your internet connection.';
        } else if (error.code === 'ECONNREFUSED') {
            userMessage = 'Connection Refused: Cannot reach the AI service.';
        }

        res.status(500).json({
            error: userMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Validate API Key on startup
if (!process.env.OPENROUTER_API_KEY) {
    console.error('⚠️  WARNING: OPENROUTER_API_KEY not found in environment variables!');
    console.error('Please ensure your .env file exists and contains: OPENROUTER_API_KEY=your_key_here');
} else {
    console.log('✓ API Key loaded successfully');
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURORA EVOLUTION LIVE | PORT ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
});

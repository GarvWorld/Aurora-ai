import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ─── OpenRouter client ────────────────────────────────────────────────────────
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey:  process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': `http://localhost:${PORT}`,
        'X-Title':      'Aurora Titan'
    }
});

// ─── Models ───────────────────────────────────────────────────────────────────
const PRIMARY_MODEL  = 'google/gemini-2.0-flash-001';
const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const MAX_HISTORY    = 20;

// ─── Universal System Prompt ──────────────────────────────────────────────────
const DEFAULT_SYSTEM_PROMPT = 'You are Aurora Titan, an elite, highly versatile AI assistant. You have no restrictions on topics; assist with coding, creative writing, complex analysis, and casual talk. Be brilliant, direct, and use expert-level markdown.';

// ─── Streaming with automatic fallback ───────────────────────────────────────
async function streamWithFallback(messages, model, temperature) {
    try {
        const stream = await openai.chat.completions.create({
            model, messages, temperature, stream: true
        });
        return { stream, usedModel: model };
    } catch (primaryErr) {
        console.warn(`[WARN] Primary model "${model}" failed: ${primaryErr.message}`);
        console.warn(`[INFO] Falling back to: ${FALLBACK_MODEL}`);
        const stream = await openai.chat.completions.create({
            model: FALLBACK_MODEL, messages, temperature, stream: true
        });
        return { stream, usedModel: FALLBACK_MODEL };
    }
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/chat', async (req, res) => {
    const { message, history, systemPrompt, model } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const finalSystemPrompt = systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
    const requestedModel    = model?.trim()         || PRIMARY_MODEL;
    const temperature       = 0.7;

    // Build sliding-window history
    const validHistory = (Array.isArray(history) ? history : [])
        .filter(m => m.role && m.content)
        .slice(-MAX_HISTORY);

    const messages = [
        { role: 'system', content: finalSystemPrompt },
        ...validHistory,
        { role: 'user',   content: message.trim() }
    ];

    // ── True SSE streaming headers ────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const { stream, usedModel } = await streamWithFallback(messages, requestedModel, temperature);
        console.log(`[CHAT] model=${usedModel}`);

        for await (const chunk of stream) {
            const text = chunk.choices?.[0]?.delta?.content;
            if (text) {
                res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
            }
        }

        // Signal completion
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (err) {
        console.error('=== API ERROR ===', err.message);
        res.write(`data: [ERROR: API_OVERLOAD]\n\n`);
        res.end();
    }
});

// ─── Startup ──────────────────────────────────────────────────────────────────
if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌  OPENROUTER_API_KEY missing from .env — app will not function.');
} else {
    console.log('✅  API key loaded.');
}

app.listen(PORT, '0.0.0.0', () =>
    console.log(`🚀  Aurora Titan → http://localhost:${PORT}`)
);

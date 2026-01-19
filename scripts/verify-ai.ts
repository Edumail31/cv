
import path from 'path';
import { Groq } from 'groq-sdk';
import fs from 'fs';

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (!line || line.startsWith('#')) continue;
        const [key, ...valParts] = line.split('=');
        if (key && valParts.length > 0) {
            const val = valParts.join('=').trim();
            process.env[key.trim()] = val;
        }
    }
}

async function verifyGroq() {
    console.log('\n--- Verifying Groq ---');
    if (!process.env.GROQ_API_KEY) {
        console.log('❌ GROQ_API_KEY is missing');
        return;
    }
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const start = Date.now();
        await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Hi' }],
            model: 'llama-3.3-70b-versatile',
        });
        console.log(`✅ Groq Working (${Date.now() - start}ms)`);
    } catch (e: any) {
        console.log(`❌ Groq Failed: ${e.message}`);
    }
}

async function verifyGemini() {
    console.log('\n--- Verifying Gemini ---');
    if (!process.env.GEMINI_API_KEY) {
        console.log('❌ GEMINI_API_KEY is missing');
        return;
    }
    const key = process.env.GEMINI_API_KEY;
    try {
        const start = Date.now();
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Hi' }] }]
                })
            }
        );
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`${res.status} - ${txt}`);
        }
        console.log(`✅ Gemini Working (${Date.now() - start}ms)`);
    } catch (e: any) {
        console.log(`❌ Gemini Failed: ${e.message}`);
    }
}

async function verifyBaseten() {
    console.log('\n--- Verifying Baseten ---');
    if (!process.env.BASETEN_API_KEY) {
        console.log('❌ BASETEN_API_KEY is missing');
        // I won't print the key to logs for safety
        return;
    }

    // We are trusting that 'fs' read the key correctly.
    // Let's verify character length just to be sure it's read.
    // console.log(`Key length: ${process.env.BASETEN_API_KEY.length}`); 

    try {
        const start = Date.now();
        const res = await fetch("https://inference.baseten.co/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.BASETEN_API_KEY}`
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 10
            })
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`${res.status} - ${txt}`);
        }
        const data = await res.json();
        console.log(`✅ Baseten Working (${Date.now() - start}ms)`);
    } catch (e: any) {
        console.log(`❌ Baseten Failed: ${e.message}`);
    }
}

async function main() {
    await verifyGroq();
    await verifyBaseten();
    await verifyGemini();
}

main();

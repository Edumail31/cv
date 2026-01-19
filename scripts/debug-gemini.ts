
import path from 'path';
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

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.log("❌ No GEMINI_API_KEY found");
        return;
    }
    console.log("Using Key:", key.substring(0, 10) + "...");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const txt = await res.text();
        console.log("Status:", res.status);
        if (res.ok) {
            const data = JSON.parse(txt);
            console.log("Available Models:");
            data.models?.forEach((m: any) => {
                if (m.name.includes('gemini')) {
                    console.log(` - ${m.name}`);
                }
            });
        } else {
            console.log("Error Body:", txt);
        }
    } catch (e: any) {
        console.log("Fetch Error:", e.message);
    }
}

listModels();

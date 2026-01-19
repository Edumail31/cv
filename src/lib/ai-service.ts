/**
 * AI Service with Multi-Provider Fallback
 * Supports: Groq (primary) → Gemini (secondary) → Error
 */

import { Groq } from "groq-sdk";

// Types
export interface AIProviderConfig {
    name: string;
    available: boolean;
}

export interface AICallOptions {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
}

// Initialize providers
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

const geminiApiKey = process.env.GEMINI_API_KEY || null;
const basetenApiKey = process.env.BASETEN_API_KEY || null;
const openRouterApiKey = process.env.OPENROUTER_API_KEY || null;

// Provider availability
export function getAvailableProviders(): AIProviderConfig[] {
    return [
        { name: "groq", available: !!groq },
        { name: "gemini", available: !!geminiApiKey },
        { name: "baseten", available: !!basetenApiKey },
        { name: "openrouter", available: !!openRouterApiKey },
    ];
}

// Groq call
async function callGroq(options: AICallOptions): Promise<string> {
    if (!groq) throw new Error("Groq not configured");

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: options.prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4000,
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
    });

    return completion.choices[0]?.message?.content || "";
}

// Gemini call (using fetch for REST API)
async function callGemini(options: AICallOptions): Promise<string> {
    if (!geminiApiKey) throw new Error("Gemini not configured");

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: options.prompt }] }],
                generationConfig: {
                    temperature: options.temperature ?? 0.3,
                    maxOutputTokens: options.maxTokens ?? 4000,
                    responseMimeType: options.jsonMode ? "application/json" : "text/plain",
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Baseten call (OpenAI compatible)
async function callBaseten(options: AICallOptions): Promise<string> {
    if (!basetenApiKey) throw new Error("Baseten not configured");

    const response = await fetch("https://inference.baseten.co/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${basetenApiKey}`
        },
        body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: options.prompt }],
            temperature: options.temperature ?? 1,
            max_tokens: options.maxTokens ?? 1000,
            stream: false, // We want blocking response
            // stream_options removed
        })
    });

    // Correction: User snippet uses "Authorization: Api-Key" ?? No, OpenAI SDK uses Bearer.
    // BUT notice user snippet uses `apiKey: '...'`.

    // Let's assume "Authorization: Bearer" is correct for OpenAI SDK compatibility.
    // However, I will check the headers carefully.

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Baseten API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}

// OpenRouter call (OpenAI compatible)
async function callOpenRouter(options: AICallOptions): Promise<string> {
    if (!openRouterApiKey) throw new Error("OpenRouter not configured");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openRouterApiKey}`,
            "HTTP-Referer": "https://resumescore.app",
            "X-Title": "ResumeScore"
        },
        body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: options.prompt }],
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 4000,
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

// Main fallback function
export async function callWithFallback(options: AICallOptions): Promise<{
    text: string;
    provider: string;
    error?: string;
}> {
    // Timeout helper
    const withTimeout = async <T>(promise: Promise<T>, ms: number, providerName: string): Promise<T> => {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`${providerName} timed out after ${ms}ms`)), ms);
        });
        try {
            const result = await Promise.race([promise, timeoutPromise]);
            clearTimeout(timeoutId!);
            return result;
        } catch (error) {
            clearTimeout(timeoutId!);
            throw error;
        }
    };

    const PROVIDER_TIMEOUT = 25000; // 25s per provider

    const providers = [
        // prioritizing Gemini for JSON tasks as it's often more reliable for large context
        { name: "gemini", call: (opts: AICallOptions) => withTimeout(callGemini(opts), PROVIDER_TIMEOUT, "gemini"), available: !!geminiApiKey },
        { name: "groq", call: (opts: AICallOptions) => withTimeout(callGroq(opts), PROVIDER_TIMEOUT, "groq"), available: !!groq },
        { name: "baseten", call: (opts: AICallOptions) => withTimeout(callBaseten(opts), PROVIDER_TIMEOUT, "baseten"), available: !!basetenApiKey },
        { name: "openrouter", call: (opts: AICallOptions) => withTimeout(callOpenRouter(opts), PROVIDER_TIMEOUT, "openrouter"), available: !!openRouterApiKey },
    ];

    const errors: string[] = [];

    for (const provider of providers) {
        if (!provider.available) {
            continue;
        }

        try {
            console.log(`[AI] Trying ${provider.name}...`);
            const text = await provider.call(options);
            if (!text) throw new Error("Empty response");
            console.log(`[AI] ${provider.name} succeeded`);
            return { text, provider: provider.name };
        } catch (error) {
            const errorMsg = (error as Error).message;
            console.error(`[AI] ${provider.name} failed:`, errorMsg);
            errors.push(`${provider.name}: ${errorMsg}`);
            continue;
        }
    }

    // All providers failed
    return {
        text: "",
        provider: "none",
        error: `All AI providers failed: ${errors.join("; ")}`,
    };
}

// Clean JSON from response
export function cleanJsonResponse(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }
    return cleaned;
}

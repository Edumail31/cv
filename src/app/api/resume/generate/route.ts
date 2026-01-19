
import { NextRequest, NextResponse } from "next/server";
import { NormalizedResume } from "@/lib/types/resume-generator";
import { callWithFallback } from "@/lib/ai-service";

const SYSTEM_PROMPT = `You are an expert Resume writer and ATS optimizer.
Your goal is to normalize resume data into a strict JSON schema and then rewrite content to be high-impact, ATS-friendly, and role-optimized.
You MUST preserve all factual information, dates, and names.
You MUST NOT invent metrics or experiences.`;

export async function POST(req: NextRequest) {
    try {
        const { currentResume, targetRole, profile } = await req.json();

        if (!currentResume) {
            return NextResponse.json({ success: false, error: "No resume provided" }, { status: 400 });
        }

        // --- STEP 1: NORMALIZATION & REWRITING (Combined for speed/cost, or separate for quality?) ---
        // The requirements ask for "Section-by-Section AI Rewrite".
        // To be robust and high-quality "not cheap libraries", we should probably do a structured call.

        // Construct the prompt with the "Deep AI Generation Logic" from requirements.
        const prompt = `
        Transform the following parsed resume data into a normalized, ATS-optimized JSON structure for a "${targetRole}" position (${profile} level).

        INPUT DATA:
        ${JSON.stringify(currentResume, null, 2)}

        STRICT OUTPUT SCHEMA (JSON ONLY):
        {
            "header": { "name": "...", "email": "...", "phone": "...", "location": "...", "linkedin": "..." },
            "sections": {
                "summary": "Rewrite to identify as ${targetRole}. Keep SAME length. Use strong keywords.",
                "experience": [
                    {
                        "company": "...", "role": "...", "startDate": "...", "endDate": "...",
                        "description": [
                            "Rewrite each bullet using Action + Context + Result format.",
                            "Do NOT shorten. Preserve technical details.",
                            "Ensure ${targetRole} keywords are naturally integrated."
                        ]
                    }
                ],
                "projects": [
                    {
                        "name": "...", 
                        "technologies": ["List", "Tools"],
                        "description": ["Rewrite to emphasize technical depth and outcome."]
                    }
                ],
                "skills": {
                    "languages": [], "frontend": [], "backend": [], "tools": [], "frameworks": []
                },
                "education": [
                     { "institution": "...", "degree": "...", "startDate": "...", "endDate": "..." }
                ]
            }
        }

        RULES:
        1. PRESERVE ALL DATES, COMPANIES, AND TITLES EXACTLY.
        2. DO NOT REMOVE CONTENT. If a section exists in input, it MUST exist in output.
        3. OPTIMIZE FOR ATS: Use standard headings and keywords for ${targetRole}.
        4. NO MARKDOWN. RETURN PURE JSON.
        `;

        const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;

        const aiResult = await callWithFallback({
            prompt: fullPrompt,
            jsonMode: true
        });

        if (!aiResult.text) {
            throw new Error("AI returned empty response");
        }

        // Clean and parse
        let normalized: NormalizedResume;
        try {
            // Robust JSON extraction
            let cleaned = aiResult.text.trim();
            // Remove markdown formatters if present
            cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');

            // Find the first '{' and last '}' to handle any preamble/postscript
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }

            // Additional cleaning for common JSON issues from AI
            // Remove trailing commas before } or ]
            cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
            // Replace smart quotes with regular quotes
            cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
            // Remove any control characters except newlines and tabs
            cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

            normalized = JSON.parse(cleaned);
        } catch (e) {
            console.error("JSON Parse Error", e);
            console.error("Raw AI Response:", aiResult.text); // Log for debugging
            throw new Error(`Failed to parse AI response: ${(e as Error).message}`);
        }

        return NextResponse.json({ success: true, data: normalized });

    } catch (error) {
        console.error("Resume Generation Error:", error);
        return NextResponse.json(
            { success: false, error: (error as Error).message || "Failed to generate resume" },
            { status: 500 }
        );
    }
}

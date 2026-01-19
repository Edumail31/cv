import { NextRequest, NextResponse } from "next/server";
import { incrementUsage, checkAILimit } from "@/lib/user-service";

export async function POST(request: NextRequest) {
    try {
        const { text, userId } = await request.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // Check usage limits BEFORE processing
        const usageCheck = await checkAILimit(userId);

        if (!usageCheck.allowed) {
            return NextResponse.json({
                error: "limit_reached",
                message: `You've used all ${usageCheck.limit} AI enhancements. Upgrade to Pro for more.`,
                remaining: 0,
                limit: usageCheck.limit,
            }, { status: 403 });
        }

        // Using Groq API for fast AI responses
        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey) {
            // Fallback: Return slightly improved text if no API key
            // Still increment usage since user intended to use the feature
            await incrementUsage(userId, "aiEnhancements");
            return NextResponse.json({
                enhanced: text,
                message: "AI enhancement requires API key configuration",
                remaining: usageCheck.remaining - 1,
            });
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `You are a professional resume writer. Your task is to enhance the given text to make it more professional, impactful, and ATS-friendly. 
            
Rules:
- Keep the same meaning but use stronger action verbs
- Quantify achievements where possible (add realistic metrics if none provided)
- Make it concise and professional
- Use industry-standard terminology
- Return ONLY the enhanced text, no explanations or quotes`,
                    },
                    {
                        role: "user",
                        content: `Enhance this resume text:\n\n${text}`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            throw new Error("AI API request failed");
        }

        const data = await response.json();
        const enhanced = data.choices[0]?.message?.content?.trim() || text;

        // Increment usage AFTER successful processing
        await incrementUsage(userId, "aiEnhancements");

        return NextResponse.json({
            enhanced,
            remaining: usageCheck.remaining - 1,
        });
    } catch (error) {
        console.error("AI enhance error:", error);
        return NextResponse.json(
            { error: "Failed to enhance text" },
            { status: 500 }
        );
    }
}

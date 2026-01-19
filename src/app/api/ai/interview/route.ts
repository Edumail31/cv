import { NextRequest, NextResponse } from "next/server";
import { callWithFallback } from "@/lib/ai-service";
import { parseResume } from "@/lib/resume-parser";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { canUseFeature, getAIDepth, type PlanType } from "@/lib/usage";

interface InterviewQuestion {
    question: string;
    type: "technical" | "project" | "behavioral" | "scenario" | "trap" | "scaling";
    difficulty: "Easy" | "Medium" | "Hard";
    intent: string;
    expectedAnswer?: string;
    followUps?: string[];
}

interface InterviewResult {
    totalQuestions: number;
    questions: InterviewQuestion[];
    weaknessAreas: string[];
    overallPreparedness: number;
    tips: string[];
    premiumInsights?: {
        weaknessHandling: { weakness: string; strategy: string }[];
        interviewSurvivability: number;
        criticalGaps: string[];
        companySpecificPrep: { company: string; focus: string }[];
    };
}

const BASE_INTERVIEW_PROMPT = `You are a senior interviewer with expertise in exposing depth and honesty in candidates. Analyze this resume and generate targeted interview questions.

RESUME:
{RESUME_TEXT}

TARGET ROLE: {ROLE}

Generate {COUNT} interview questions that would effectively evaluate this candidate. Focus on:
1. Verifying claimed skills and experience
2. Testing technical depth
3. Probing project decisions
4. Behavioral assessment

Return ONLY valid JSON (no markdown, no code blocks):
{
  "totalQuestions": <number>,
  "questions": [
    {
      "question": "<the interview question>",
      "type": "<technical/project/behavioral/scenario/trap/scaling>",
      "difficulty": "<Easy/Medium/Hard>",
      "intent": "<what this question aims to verify>"
    }
  ],
  "weaknessAreas": ["<area1>", "<area2>"],
  "overallPreparedness": <0-100>,
  "tips": ["<preparation tip 1>", "<preparation tip 2>"]
}`;

const PREMIUM_INTERVIEW_PROMPT = `You are an elite interview strategist who has conducted 1000+ technical interviews at top companies. Provide COMPREHENSIVE interview preparation.

RESUME:
{RESUME_TEXT}

TARGET ROLE: {ROLE}

Generate {COUNT} targeted interview questions with FULL preparation guidance.

Return ONLY valid JSON with ALL fields:
{
  "totalQuestions": <number>,
  "questions": [
    {
      "question": "<detailed interview question>",
      "type": "<technical/project/behavioral/scenario/trap/scaling>",
      "difficulty": "<Easy/Medium/Hard>",
      "intent": "<what interviewers are looking for>",
      "expectedAnswer": "<ideal answer structure and key points to hit>",
      "followUps": ["<likely follow-up question 1>", "<likely follow-up question 2>"]
    }
  ],
  "weaknessAreas": ["<specific weakness area>"],
  "overallPreparedness": <0-100>,
  "tips": ["<actionable preparation tip>"],
  "premiumInsights": {
    "weaknessHandling": [{"weakness": "<identified weakness>", "strategy": "<how to address it>"}],
    "interviewSurvivability": <0-100>,
    "criticalGaps": ["<gap that could cause rejection>"],
    "companySpecificPrep": [{"company": "<company name>", "focus": "<what to emphasize>"}]
  }
}

QUESTION TYPES TO INCLUDE:
- Technical depth: Deep-dive into claimed technologies
- Project defense: Justifying decisions in listed projects
- Scenario reasoning: How they would handle situations
- Trap questions: Questions that catch exaggeration
- Scaling: How solutions would scale
- Behavioral stress: Past conflict and pressure situations`;

function getDefaultQuestions(): InterviewResult {
    return {
        totalQuestions: 0,
        questions: [],
        weaknessAreas: ["Unable to analyze"],
        overallPreparedness: 50,
        tips: ["Please try again with a valid resume"]
    };
}

async function checkUserAccess(userId: string): Promise<{
    allowed: boolean;
    plan: PlanType;
    remaining: number;
    message?: string;
}> {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { allowed: false, plan: "free", remaining: 0, message: "User not found" };
        }

        const userData = userDoc.data();
        const plan = (userData.tier || userData.subscription?.plan || "free") as PlanType;

        const usage = userData.featureUsage || {
            resumeAnalyzer: 0,
            resumeComparison: 0,
            interviewQuestions: 0,
            companyCompatibility: 0,
            resumeExports: 0,
            lastResetDate: new Date()
        };

        const access = canUseFeature(usage, plan, "interviewQuestions");

        if (!access.allowed && access.limit === 0) {
            return {
                allowed: false,
                plan,
                remaining: 0,
                message: "Interview Questions is a Pro/Premium feature. Upgrade to unlock personalized interview preparation."
            };
        }

        if (!access.allowed) {
            return {
                allowed: false,
                plan,
                remaining: 0,
                message: `You've reached your monthly limit of ${access.limit} interview sessions. Upgrade for more.`
            };
        }

        return { allowed: true, plan, remaining: access.remaining };
    } catch (error) {
        console.error("Error checking user access:", error);
        console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { allowed: false, plan: "free", remaining: 0, message: `Error checking access: ${errorMessage}` };
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const resume = formData.get("resume") as File | null;
        const resumeText = formData.get("resumeText") as string | null;
        const targetRole = formData.get("targetRole") as string || "Software Engineer";
        const questionCount = parseInt(formData.get("questionCount") as string) || 10;
        const userId = formData.get("userId") as string | null;
        // Accept plan from frontend as fallback when Firestore is unavailable
        const requestedPlan = formData.get("userPlan") as string | null;

        // Either resume file or text required
        let text = resumeText;
        if (!text && resume) {
            const buffer = Buffer.from(await resume.arrayBuffer());
            const parsed = await parseResume(buffer, resume.name);
            if (parsed.error) {
                return NextResponse.json(
                    { error: parsed.error },
                    { status: 400 }
                );
            }
            text = parsed.text;
        }

        if (!text) {
            return NextResponse.json(
                { error: "Resume content is required" },
                { status: 400 }
            );
        }

        // Determine user plan - try Firestore first, fallback to request
        let userPlan: PlanType = "pro"; // Default to pro since free can't access this feature
        let accessAllowed = true;

        if (userId) {
            const access = await checkUserAccess(userId);
            if (access.message?.includes("Missing or insufficient permissions") && requestedPlan) {
                // Firestore security rules blocked - trust frontend plan for Pro/Premium users
                userPlan = (requestedPlan === "premium" || requestedPlan === "pro") ? requestedPlan as PlanType : "pro";
                console.log(`[Interview API] Firestore blocked, using frontend plan: ${userPlan}`);
            } else if (!access.allowed) {
                return NextResponse.json(
                    { error: access.message, requiresUpgrade: true, plan: access.plan },
                    { status: 403 }
                );
            } else {
                userPlan = access.plan;
            }
        } else if (requestedPlan) {
            // No userId but have plan - use it if pro/premium
            userPlan = (requestedPlan === "premium" || requestedPlan === "pro") ? requestedPlan as PlanType : "pro";
        }

        const aiDepth = getAIDepth(userPlan);
        // Pro: up to 20 questions, Premium: up to 50 questions
        const maxQuestions = userPlan === "premium"
            ? Math.min(questionCount, 50)
            : Math.min(questionCount, 20);

        console.log(`[Interview API] Generating ${maxQuestions} questions for ${targetRole}, plan: ${userPlan}`);

        // Select prompt based on plan
        const prompt = aiDepth === "high"
            ? PREMIUM_INTERVIEW_PROMPT
                .replace("{RESUME_TEXT}", text.substring(0, 4000))
                .replace("{ROLE}", targetRole)
                .replace("{COUNT}", maxQuestions.toString())
            : BASE_INTERVIEW_PROMPT
                .replace("{RESUME_TEXT}", text.substring(0, 3000))
                .replace("{ROLE}", targetRole)
                .replace("{COUNT}", maxQuestions.toString());

        // Call AI with fallback - token budget per question count
        // ~150 tokens per question with details, plus JSON overhead
        const tokenBudget = maxQuestions <= 10 ? 2500 : maxQuestions <= 20 ? 4500 : maxQuestions <= 50 ? 10000 : 12000;
        console.log(`[Interview API] Token budget: ${tokenBudget} for ${maxQuestions} questions`);

        const systemPrompt = "You are a senior interviewer. Return ONLY valid JSON, no markdown or code blocks. Generate ALL requested questions.";

        const aiResult = await callWithFallback({
            prompt: systemPrompt + "\n\n" + prompt,
            jsonMode: true,
            maxTokens: tokenBudget
        });

        if (!aiResult.text) {
            console.error("[Interview API] AI fallback failed:", aiResult.error);
            throw new Error(aiResult.error || "AI returned empty response");
        }
        console.log(`[Interview API] AI succeeded using: ${aiResult.provider}`);

        let result: InterviewResult;
        try {
            let cleanJson = aiResult.text.trim();
            if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.replace(/```json?\n?/g, "").replace(/```$/g, "");
            }
            // Remove trailing commas
            cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }
            result = JSON.parse(cleanJson);
        } catch {
            console.error("Failed to parse AI response:", aiResult.text);
            result = getDefaultQuestions();
        }

        // Filter output for pro users (no expected answers or premium insights)
        if (userPlan === "pro") {
            result.questions = result.questions.map(q => ({
                ...q,
                expectedAnswer: undefined,
                followUps: undefined
            }));
            delete result.premiumInsights;
        }

        // Update usage count
        if (userId) {
            try {
                await updateDoc(doc(db, "users", userId), {
                    "usage.interviewQuestions": increment(1),
                    "featureUsage.interviewQuestions": increment(1),
                    "featureUsage.lastUsed": serverTimestamp()
                });

                // Log AI execution
                await addDoc(collection(db, "ai_execution_logs"), {
                    userId,
                    featureType: "INTERVIEW_QUESTIONS",
                    tokensUsed: 0,
                    modelName: aiResult.provider || "unknown",
                    createdAt: serverTimestamp()
                });
            } catch (e) {
                console.error("Error updating usage:", e);
            }
        }

        return NextResponse.json({
            success: true,
            result,
            plan: userPlan,
            tokensUsed: 0
        });

    } catch (error) {
        console.error("Interview questions error:", error);
        return NextResponse.json(
            { error: "Failed to generate interview questions" },
            { status: 500 }
        );
    }
}

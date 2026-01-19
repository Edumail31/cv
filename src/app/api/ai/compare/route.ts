import { NextRequest, NextResponse } from "next/server";
import { callWithFallback } from "@/lib/ai-service";
import { parseResume } from "@/lib/resume-parser";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { canUseFeature, getAIDepth, type PlanType } from "@/lib/usage";

interface ComparisonParameter {
    name: string;
    category: string;
    scoreA: number;
    scoreB: number;
    winner: "A" | "B" | "TIE";
    analysis: string;
}

interface ComparisonResult {
    overallScoreA: number;
    overallScoreB: number;
    winner: "A" | "B" | "TIE";
    verdict: string;
    parameters: ComparisonParameter[];
    premiumInsights?: {
        skimmability: { scoreA: number; scoreB: number; analysis: string };
        exaggerationRisk: { scoreA: number; scoreB: number; analysis: string };
        interviewSurvivability: { scoreA: number; scoreB: number; analysis: string };
        recruiterMindset: string;
        positioningAdvice: string;
    };
}

// Parameter definitions for comparison
const COMPARISON_PARAMETERS = {
    technicalStrength: [
        "Core Skill Overlap",
        "Skill Depth Evidence",
        "Real-World Usage Proof",
        "Tooling Maturity",
        "Role Relevance",
        "Stack Freshness",
        "System Exposure",
        "Learning Velocity"
    ],
    projectQuality: [
        "Project Complexity",
        "Ownership",
        "Business Impact",
        "Scalability",
        "Originality",
        "Engineering Clarity"
    ],
    experienceImpact: [
        "Quantified Results",
        "Action Verbs",
        "Responsibility Growth",
        "Collaboration",
        "Leadership",
        "Production Exposure"
    ],
    premiumOnly: [
        "Skimmability",
        "Exaggeration Risk",
        "Interview Survivability"
    ]
};

const BASE_COMPARISON_PROMPT = `You are a senior technical recruiter with 15+ years of hiring experience. Compare these two resumes for the role of {ROLE}.

RESUME A:
{RESUME_A}

RESUME B:
{RESUME_B}

Evaluate EACH resume using hiring signals and return a detailed comparison.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "overallScoreA": <0-100>,
  "overallScoreB": <0-100>,
  "winner": "<A/B/TIE>",
  "verdict": "<2-3 sentence hiring recommendation>",
  "parameters": [
    {
      "name": "<parameter name>",
      "category": "<Technical Strength/Project Quality/Experience & Impact>",
      "scoreA": <0-100>,
      "scoreB": <0-100>,
      "winner": "<A/B/TIE>",
      "analysis": "<brief comparison analysis>"
    }
  ]
}

PARAMETERS TO EVALUATE:
Technical Strength: Core Skill Overlap, Skill Depth Evidence, Real-World Usage Proof, Tooling Maturity, Role Relevance, Stack Freshness, System Exposure, Learning Velocity
Project Quality: Project Complexity, Ownership, Business Impact, Scalability, Originality, Engineering Clarity
Experience & Impact: Quantified Results, Action Verbs, Responsibility Growth, Collaboration, Leadership, Production Exposure`;

const PREMIUM_COMPARISON_PROMPT = `You are an elite hiring committee evaluator with access to industry hiring patterns. Compare these two resumes with MAXIMUM depth.

RESUME A:
{RESUME_A}

RESUME B:
{RESUME_B}

TARGET ROLE: {ROLE}

Return ONLY valid JSON with ALL 23 parameters and premium insights:
{
  "overallScoreA": <0-100>,
  "overallScoreB": <0-100>,
  "winner": "<A/B/TIE>",
  "verdict": "<detailed hiring recommendation with reasoning>",
  "parameters": [
    {
      "name": "<parameter name>",
      "category": "<category>",
      "scoreA": <0-100>,
      "scoreB": <0-100>,
      "winner": "<A/B/TIE>",
      "analysis": "<detailed comparison>"
    }
  ],
  "premiumInsights": {
    "skimmability": {"scoreA": <0-100>, "scoreB": <0-100>, "analysis": "<how quickly a recruiter can assess each>"},
    "exaggerationRisk": {"scoreA": <0-100>, "scoreB": <0-100>, "analysis": "<likelihood of inflated claims>"},
    "interviewSurvivability": {"scoreA": <0-100>, "scoreB": <0-100>, "analysis": "<predicted interview performance>"},
    "recruiterMindset": "<what hesitations or concerns would HR have about each candidate>",
    "positioningAdvice": "<how each could better position their resume>"
  }
}

EVALUATE ALL 23 PARAMETERS:
Technical Strength (8): Core Skill Overlap, Skill Depth Evidence, Real-World Usage Proof, Tooling Maturity, Role Relevance, Stack Freshness, System Exposure, Learning Velocity
Project Quality (6): Project Complexity, Ownership, Business Impact, Scalability, Originality, Engineering Clarity  
Experience & Impact (6): Quantified Results, Action Verbs, Responsibility Growth, Collaboration, Leadership, Production Exposure
Premium (3): Skimmability, Exaggeration Risk, Interview Survivability`;

function getDefaultComparison(): ComparisonResult {
    return {
        overallScoreA: 50,
        overallScoreB: 50,
        winner: "TIE",
        verdict: "Unable to generate comparison. Please try again.",
        parameters: []
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

        const access = canUseFeature(usage, plan, "resumeComparison");

        if (!access.allowed && access.limit === 0) {
            return {
                allowed: false,
                plan,
                remaining: 0,
                message: "Resume Comparison is not available on the Free plan. Upgrade to Pro or Premium to unlock this feature."
            };
        }

        if (!access.allowed) {
            return {
                allowed: false,
                plan,
                remaining: 0,
                message: `You've reached your monthly limit of ${access.limit} comparisons. Upgrade to increase your limit.`
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
        const resumeA = formData.get("resumeA") as File | null;
        const resumeB = formData.get("resumeB") as File | null;
        const targetRole = formData.get("targetRole") as string || "Software Engineer";
        const userId = formData.get("userId") as string | null;
        // Accept plan from frontend as fallback when Firestore is unavailable
        const requestedPlan = formData.get("userPlan") as string | null;

        if (!resumeA || !resumeB) {
            return NextResponse.json(
                { error: "Both resumes are required" },
                { status: 400 }
            );
        }

        // Determine user plan - try Firestore first, fallback to request
        let userPlan: PlanType = "free"; 3

        if (userId) {
            const access = await checkUserAccess(userId);
            if (access.message?.includes("Missing or insufficient permissions") && requestedPlan) {
                // Firestore security rules blocked - trust frontend plan
                userPlan = (requestedPlan === "premium" || requestedPlan === "pro" || requestedPlan === "free") ? requestedPlan as PlanType : "free";
                console.log(`[Compare API] Firestore blocked, using frontend plan: ${userPlan}`);
            } else if (!access.allowed) {
                return NextResponse.json(
                    { error: access.message, requiresUpgrade: true, plan: access.plan },
                    { status: 403 }
                );
            } else {
                userPlan = access.plan;
            }
        } else if (requestedPlan) {
            // No userId but have plan - use it
            userPlan = (requestedPlan === "premium" || requestedPlan === "pro" || requestedPlan === "free") ? requestedPlan as PlanType : "free";
        }

        // Parse both resumes
        const bufferA = Buffer.from(await resumeA.arrayBuffer());
        const bufferB = Buffer.from(await resumeB.arrayBuffer());

        const [parsedA, parsedB] = await Promise.all([
            parseResume(bufferA, resumeA.name),
            parseResume(bufferB, resumeB.name)
        ]);

        if (parsedA.error || parsedB.error) {
            return NextResponse.json(
                { error: parsedA.error || parsedB.error || "Failed to parse one or both resumes" },
                { status: 400 }
            );
        }

        const textA = parsedA.text;
        const textB = parsedB.text;

        if (!textA || !textB) {
            return NextResponse.json(
                { error: "Failed to extract text from one or both resumes" },
                { status: 400 }
            );
        }

        const aiDepth = getAIDepth(userPlan);

        // Select prompt based on plan
        const prompt = aiDepth === "high"
            ? PREMIUM_COMPARISON_PROMPT
                .replace("{RESUME_A}", textA.substring(0, 3000))
                .replace("{RESUME_B}", textB.substring(0, 3000))
                .replace("{ROLE}", targetRole)
            : BASE_COMPARISON_PROMPT
                .replace("{RESUME_A}", textA.substring(0, 2000))
                .replace("{RESUME_B}", textB.substring(0, 2000))
                .replace("{ROLE}", targetRole);

        // Call AI with fallback
        const systemPrompt = "You are a senior technical recruiter. Return ONLY valid JSON, no markdown or code blocks.";
        const tokenBudget = aiDepth === "high" ? 2000 : aiDepth === "medium" ? 1500 : 800;

        const aiResult = await callWithFallback({
            prompt: systemPrompt + "\n\n" + prompt,
            jsonMode: true,
            maxTokens: tokenBudget
        });

        if (!aiResult.text) {
            console.error("[Compare API] AI fallback failed:", aiResult.error);
            throw new Error(aiResult.error || "AI returned empty response");
        }
        console.log(`[Compare API] AI succeeded using: ${aiResult.provider}`);

        let result: ComparisonResult;
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
            result = getDefaultComparison();
        }

        // Filter output for free users (partial output)
        if (userPlan === "free") {
            result.parameters = result.parameters.slice(0, 8); // Only first 8 parameters
            result.verdict = result.verdict.split(".")[0] + ". Upgrade to Pro for full analysis.";
            delete result.premiumInsights;
        } else if (userPlan === "pro") {
            delete result.premiumInsights;
        }

        // Update usage count
        if (userId) {
            try {
                await updateDoc(doc(db, "users", userId), {
                    "usage.resumeComparison": increment(1),
                    "featureUsage.resumeComparison": increment(1),
                    "featureUsage.lastUsed": serverTimestamp()
                });

                // Log AI execution
                await addDoc(collection(db, "ai_execution_logs"), {
                    userId,
                    featureType: "RESUME_COMPARISON",
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
        console.error("Resume comparison error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `Failed to compare resumes: ${errorMessage}` },
            { status: 500 }
        );
    }
}

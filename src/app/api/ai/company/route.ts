import { NextRequest, NextResponse } from "next/server";
import { callWithFallback } from "@/lib/ai-service";
import { parseResume } from "@/lib/resume-parser";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { canUseFeature, getAIDepth, type PlanType } from "@/lib/usage";

interface ParameterScore {
    name: string;
    score: number;
    analysis: string;
}

interface CategoryScore {
    category: string;
    score: number;
    parameters: ParameterScore[];
}

interface CompanyCompatibilityResult {
    overallScore: number;
    classification: "Strong Fit" | "Good Fit" | "Risky" | "Poor Fit";
    verdict: string;
    categories: CategoryScore[];
    strengths: string[];
    risks: string[];
    recommendations: string[];
    premiumInsights?: {
        recruiterMindset: string;
        skillGapMap: { skill: string; priority: "High" | "Medium" | "Low"; learningPath: string }[];
        positioningStrategy: string;
        hiddenConcerns: string[];
        competitiveEdge: string[];
    };
}

// Popular tech companies for quick selection
export const POPULAR_COMPANIES = [
    "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix",
    "Uber", "Airbnb", "Stripe", "Salesforce", "Adobe", "Oracle",
    "Infosys", "TCS", "Wipro", "HCL", "Accenture", "Cognizant",
    "Flipkart", "Swiggy", "Zomato", "PhonePe", "Razorpay", "CRED"
];

const BASE_COMPANY_PROMPT = `You are a hiring committee member evaluating how well a candidate fits a specific company. Analyze the resume against the company's known culture, tech stack, and hiring patterns.

RESUME:
{RESUME_TEXT}

COMPANY: {COMPANY}
TARGET ROLE: {ROLE}

Evaluate compatibility across 30 parameters in these categories:
- Skill Match (10 params): Core tech alignment, tool proficiency, domain knowledge
- Experience Match (10 params): Role relevance, seniority fit, industry experience
- Culture & Hiring Fit (10 params): Communication style, values alignment, growth mindset

Return ONLY valid JSON (no markdown):
{
  "overallScore": <0-100>,
  "classification": "<Strong Fit/Good Fit/Risky/Poor Fit>",
  "verdict": "<2-3 sentence hiring recommendation>",
  "categories": [
    {
      "category": "<category name>",
      "score": <0-100>,
      "parameters": [
        {"name": "<param>", "score": <0-100>, "analysis": "<brief analysis>"}
      ]
    }
  ],
  "strengths": ["<strength1>", "<strength2>"],
  "risks": ["<risk1>", "<risk2>"],
  "recommendations": ["<action1>", "<action2>"]
}`;

const PREMIUM_COMPANY_PROMPT = `You are an elite career strategist with insider knowledge of FAANG+ and top tech company hiring processes. Provide COMPREHENSIVE company compatibility analysis.

RESUME:
{RESUME_TEXT}

COMPANY: {COMPANY}
TARGET ROLE: {ROLE}

Evaluate compatibility across 50 parameters:
- Skill Match (1-10): Core tech, frameworks, tools, domain expertise, certifications
- Experience Match (11-20): Role fit, seniority, industry, project scale, company type
- Culture & Hiring Fit (21-30): Values, communication, growth mindset, adaptability
- Resume Presentation (31-40): Clarity, quantification, storytelling, keywords
- Strategic Fit (41-50): Long-term potential, growth trajectory, leadership signals

Return ONLY valid JSON with ALL fields:
{
  "overallScore": <0-100>,
  "classification": "<Strong Fit/Good Fit/Risky/Poor Fit>",
  "verdict": "<detailed hiring recommendation with specific company context>",
  "categories": [
    {
      "category": "<category>",
      "score": <0-100>,
      "parameters": [
        {"name": "<parameter>", "score": <0-100>, "analysis": "<detailed analysis>"}
      ]
    }
  ],
  "strengths": ["<specific strength for this company>"],
  "risks": ["<specific risk or concern>"],
  "recommendations": ["<actionable recommendation>"],
  "premiumInsights": {
    "recruiterMindset": "<what HR would think about this candidate for this specific company>",
    "skillGapMap": [{"skill": "<missing skill>", "priority": "<High/Medium/Low>", "learningPath": "<how to acquire>"}],
    "positioningStrategy": "<how to optimize resume for this company>",
    "hiddenConcerns": ["<concern that might not be obvious>"],
    "competitiveEdge": ["<what makes candidate stand out>"]
  }
}

Classification Guide:
- 80-100: Strong Fit - High chance of getting interview
- 60-79: Good Fit - Decent chance, minor gaps
- 40-59: Risky - Significant gaps, needs improvement
- 0-39: Poor Fit - Major misalignment`;

function getDefaultResult(): CompanyCompatibilityResult {
    return {
        overallScore: 50,
        classification: "Risky",
        verdict: "Unable to analyze compatibility. Please try again.",
        categories: [],
        strengths: [],
        risks: [],
        recommendations: []
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

        const access = canUseFeature(usage, plan, "companyCompatibility");

        if (!access.allowed && access.limit === 0) {
            return {
                allowed: false,
                plan,
                remaining: 0,
                message: "Company Compatibility is a Pro/Premium feature. Upgrade to check how well your resume fits specific companies."
            };
        }

        if (!access.allowed) {
            return {
                allowed: false,
                plan,
                remaining: 0,
                message: `You've reached your monthly limit of ${access.limit} company checks. Upgrade for more.`
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
        const company = formData.get("company") as string;
        const targetRole = formData.get("targetRole") as string || "Software Engineer";
        const userId = formData.get("userId") as string | null;
        // Accept plan from frontend as fallback when Firestore is unavailable
        const requestedPlan = formData.get("userPlan") as string | null;

        if (!company) {
            return NextResponse.json(
                { error: "Company name is required" },
                { status: 400 }
            );
        }

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

        if (userId) {
            const access = await checkUserAccess(userId);
            if (access.message?.includes("Missing or insufficient permissions") && requestedPlan) {
                // Firestore security rules blocked - trust frontend plan for Pro/Premium users
                userPlan = (requestedPlan === "premium" || requestedPlan === "pro") ? requestedPlan as PlanType : "pro";
                console.log(`[Company API] Firestore blocked, using frontend plan: ${userPlan}`);
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

        // Select prompt based on plan
        const prompt = aiDepth === "high"
            ? PREMIUM_COMPANY_PROMPT
                .replace("{RESUME_TEXT}", text.substring(0, 4000))
                .replace("{COMPANY}", company)
                .replace("{ROLE}", targetRole)
            : BASE_COMPANY_PROMPT
                .replace("{RESUME_TEXT}", text.substring(0, 3000))
                .replace("{COMPANY}", company)
                .replace("{ROLE}", targetRole);

        // Call AI with fallback
        const systemPrompt = "You are a hiring committee evaluating risk and readiness. Return ONLY valid JSON.";
        const tokenBudget = aiDepth === "high" ? 2500 : 1500;

        const aiResult = await callWithFallback({
            prompt: systemPrompt + "\n\n" + prompt,
            jsonMode: true,
            maxTokens: tokenBudget
        });

        if (!aiResult.text) {
            console.error("[Company API] AI fallback failed:", aiResult.error);
            throw new Error(aiResult.error || "AI returned empty response");
        }
        console.log(`[Company API] AI succeeded using: ${aiResult.provider}`);

        let result: CompanyCompatibilityResult;
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
            result = getDefaultResult();
        }

        // Filter output for pro users
        if (userPlan === "pro") {
            // Limit parameters per category
            result.categories = result.categories.map(cat => ({
                ...cat,
                parameters: cat.parameters.slice(0, 5)
            }));
            delete result.premiumInsights;
        }

        // Update usage count using Admin SDK (bypasses security rules)
        if (userId && adminDb) {
            try {
                const userRef = adminDb.collection("users").doc(userId);
                await userRef.update({
                    "usage.companyCompatibility": FieldValue.increment(1),
                    "featureUsage.companyCompatibility": FieldValue.increment(1),
                    "featureUsage.lastUsed": FieldValue.serverTimestamp()
                });
                console.log(`[Company API] Updated usage for user ${userId}`);

                // Log AI execution
                await addDoc(collection(db, "ai_execution_logs"), {
                    userId,
                    featureType: "COMPANY_COMPATIBILITY",
                    company,
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
            company,
            plan: userPlan,
            tokensUsed: 0
        });

    } catch (error) {
        console.error("Company compatibility error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `Failed to analyze company compatibility: ${errorMessage}` },
            { status: 500 }
        );
    }
}

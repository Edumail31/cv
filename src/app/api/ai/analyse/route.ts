import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/resume-parser";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { callWithFallback, cleanJsonResponse, getAvailableProviders } from "@/lib/ai-service";

// Log available AI providers on startup
console.log("[AI] Available providers:", getAvailableProviders().filter(p => p.available).map(p => p.name).join(", ") || "none");


export interface AnalysisResult {
    overallScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    gradeDescription: string;
    scores: {
        education: { score: number; feedback: string };
        experience: { score: number; feedback: string };
        technicalSkills: { score: number; feedback: string };
        projects: { score: number; feedback: string };
        presentation: { score: number; feedback: string };
    };
    profile: { name: string; email: string; phone: string; location: string; summary: string };
    skills: { technical: string[]; languages: string[]; soft: string[]; mlAi: string[]; tools: string[] };
    experience: Array<{ title: string; company: string; duration: string; description: string; highlights: string[] }>;
    education: Array<{ degree: string; institution: string; year: string; grade?: string }>;
    projects: Array<{ name: string; description: string; technologies: string[]; impact?: string }>;
    marketIntelligence: { salaryRange: string; experienceLevel: string; atsCompatibility: number; marketDemand: string };
    roleCompatibility: { fullstack: number; frontend: number; backend: number; mobile: number; devops: number; datascience: number; sde: number };
    strengths: string[];
    weaknesses: string[];
    proTips: string[];
    interviewPrep: { recruiterQuestions: string[]; technicalQuestions: string[]; behavioralQuestions: string[]; tips: string[] };
    // Premium Analysis Fields (50+ parameters)
    premiumAnalysis?: {
        // Deep Skills Analysis (10 params)
        skillsMarketDemand: Array<{ skill: string; demand: "Very High" | "High" | "Medium" | "Low"; trend: "Rising" | "Stable" | "Declining"; salaryImpact: string }>;
        missingCriticalSkills: string[];
        skillGaps: string[];
        skillFreshness: { outdated: string[]; current: string[]; emerging: string[] };
        industryBenchmark: number;

        // Career Intelligence (10 params)
        careerTrajectory: { currentLevel: string; nextLevel: string; timeToPromotion: string; recommendedPath: string[] };
        roleProgression: string[];
        industryFit: { tech: number; finance: number; healthcare: number; ecommerce: number; consulting: number };
        companyTypeFit: { startup: number; midsize: number; enterprise: number; mnc: number };
        remoteWorkScore: number;

        // Compensation Analysis (10 params)
        compensationDetails: {
            baseRange: string;
            bonusRange: string;
            equityPotential: string;
            totalCompRange: string;
            locationAdjusted: { metro: string; tier2: string; remote: string };
            yearsToNextBand: string;
        };
        negotiationLeverage: number;
        marketPositioning: "Below Market" | "At Market" | "Above Market";

        // ATS Optimization (10 params)
        atsDetails: {
            overallScore: number;
            keywordDensity: number;
            formatScore: number;
            sectionCompleteness: number;
            actionVerbScore: number;
            quantificationScore: number;
            missingKeywords: string[];
            redundantPhrases: string[];
            suggestedKeywords: string[];
            formattingIssues: string[];
        };

        // Interview Intelligence (10 params)
        interviewIntelligence: {
            companySpecificQuestions: Array<{ company: string; questions: string[] }>;
            weaknessHandling: Array<{ weakness: string; strategy: string }>;
            salaryNegotiationScript: string[];
            followUpTemplates: string[];
            redFlagMitigation: string[];
            competencyGaps: string[];
            strongAnswerPoints: string[];
            culturalFitIndicators: string[];
        };

        // Market Insights (10 params)
        marketInsights: {
            jobOpenings: string;
            hiringTrend: "Hot" | "Active" | "Moderate" | "Slow";
            topHiringCompanies: string[];
            emergingRoles: string[];
            skillDemandForecast: Array<{ skill: string; forecast: string }>;
            geographicHotspots: string[];
            industryGrowth: string;
            competitionLevel: "Low" | "Medium" | "High" | "Very High";
        };
    };
}

const ANALYSIS_PROMPT = `You are an expert resume analyzer. Analyze this resume and return JSON.

RESUME:
{RESUME_TEXT}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "overallScore": <0-100>,
  "grade": "<A/B/C/D/F based on score>",
  "gradeDescription": "<one sentence about job prospects>",
  "scores": {
    "education": { "score": <0-100>, "feedback": "<specific feedback>" },
    "experience": { "score": <0-100>, "feedback": "<specific feedback>" },
    "technicalSkills": { "score": <0-100>, "feedback": "<specific feedback>" },
    "projects": { "score": <0-100>, "feedback": "<specific feedback>" },
    "presentation": { "score": <0-100>, "feedback": "<specific feedback>" }
  },
  "profile": {
    "name": "<name or Not Found>",
    "email": "<email or Not Found>",
    "phone": "<phone or Not Found>",
    "location": "<location or Not Found>",
    "summary": "<2-3 sentence professional summary>"
  },
  "skills": {
    "technical": ["<skill1>", "<skill2>"],
    "languages": ["<programming languages>"],
    "soft": ["<soft skills>"],
    "mlAi": ["<ML/AI skills>"],
    "tools": ["<tools>"]
  },
  "experience": [{"title": "", "company": "", "duration": "", "description": "", "highlights": []}],
  "education": [{"degree": "", "institution": "", "year": "", "grade": ""}],
  "projects": [{"name": "", "description": "", "technologies": [], "impact": ""}],
  "marketIntelligence": {
    "salaryRange": "<₹X-Y LPA>",
    "experienceLevel": "<Entry/Mid/Senior/Lead/Executive>",
    "atsCompatibility": <0-100>,
    "marketDemand": "<High/Medium/Low>"
  },
  "roleCompatibility": {"fullstack": <0-100>, "frontend": <0-100>, "backend": <0-100>, "mobile": <0-100>, "devops": <0-100>, "datascience": <0-100>, "sde": <0-100>},
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<area for improvement1>", "<area for improvement2>"],
  "proTips": ["<actionable tip1>", "<actionable tip2>", "<actionable tip3>"],
  "interviewPrep": {
    "recruiterQuestions": ["<question1>", "<question2>", "<question3>"],
    "technicalQuestions": ["<question1>", "<question2>", "<question3>"],
    "behavioralQuestions": ["<question1>", "<question2>"],
    "tips": ["<tip1>", "<tip2>"]
  }
}`;

const PREMIUM_ANALYSIS_PROMPT = `You are an elite career intelligence AI with access to market data. Provide PREMIUM analysis with 50+ parameters.

RESUME:
{RESUME_TEXT}

Return ONLY valid JSON with ALL these premium fields:
{
  "overallScore": <0-100>,
  "grade": "<A/B/C/D/F>",
  "gradeDescription": "<job prospects>",
  "scores": {
    "education": { "score": <0-100>, "feedback": "<feedback>" },
    "experience": { "score": <0-100>, "feedback": "<feedback>" },
    "technicalSkills": { "score": <0-100>, "feedback": "<feedback>" },
    "projects": { "score": <0-100>, "feedback": "<feedback>" },
    "presentation": { "score": <0-100>, "feedback": "<feedback>" }
  },
  "profile": {"name": "", "email": "", "phone": "", "location": "", "summary": ""},
  "skills": {"technical": [], "languages": [], "soft": [], "mlAi": [], "tools": []},
  "experience": [{"title": "", "company": "", "duration": "", "description": "", "highlights": []}],
  "education": [{"degree": "", "institution": "", "year": "", "grade": ""}],
  "projects": [{"name": "", "description": "", "technologies": [], "impact": ""}],
  "marketIntelligence": {"salaryRange": "", "experienceLevel": "", "atsCompatibility": 0, "marketDemand": ""},
  "roleCompatibility": {"fullstack": 0, "frontend": 0, "backend": 0, "mobile": 0, "devops": 0, "datascience": 0, "sde": 0},
  "strengths": [],
  "weaknesses": [],
  "proTips": [],
  "interviewPrep": {"recruiterQuestions": [], "technicalQuestions": [], "behavioralQuestions": [], "tips": []},
  
  "premiumAnalysis": {
    "skillsMarketDemand": [
      {"skill": "<each skill>", "demand": "<Very High/High/Medium/Low>", "trend": "<Rising/Stable/Declining>", "salaryImpact": "<+X% to salary>"}
    ],
    "missingCriticalSkills": ["<skills missing but important for target roles>"],
    "skillGaps": ["<specific skill gaps to address>"],
    "skillFreshness": {
      "outdated": ["<skills that are becoming obsolete>"],
      "current": ["<in-demand skills already present>"],
      "emerging": ["<new skills candidate should learn>"]
    },
    "industryBenchmark": <0-100 percentile vs industry>,
    
    "careerTrajectory": {
      "currentLevel": "<Junior/Mid/Senior/Staff/Principal>",
      "nextLevel": "<next logical career step>",
      "timeToPromotion": "<estimated time>",
      "recommendedPath": ["<step1>", "<step2>", "<step3>"]
    },
    "roleProgression": ["<role1>", "<role2>", "<role3>"],
    "industryFit": {"tech": <0-100>, "finance": <0-100>, "healthcare": <0-100>, "ecommerce": <0-100>, "consulting": <0-100>},
    "companyTypeFit": {"startup": <0-100>, "midsize": <0-100>, "enterprise": <0-100>, "mnc": <0-100>},
    "remoteWorkScore": <0-100>,
    
    "compensationDetails": {
      "baseRange": "<₹X-Y LPA base salary>",
      "bonusRange": "<X-Y% bonus>",
      "equityPotential": "<stock options potential>",
      "totalCompRange": "<total compensation range>",
      "locationAdjusted": {"metro": "<salary in metros>", "tier2": "<salary in tier 2>", "remote": "<remote salary>"},
      "yearsToNextBand": "<time to next salary band>"
    },
    "negotiationLeverage": <0-100>,
    "marketPositioning": "<Below Market/At Market/Above Market>",
    
    "atsDetails": {
      "overallScore": <0-100>,
      "keywordDensity": <0-100>,
      "formatScore": <0-100>,
      "sectionCompleteness": <0-100>,
      "actionVerbScore": <0-100>,
      "quantificationScore": <0-100>,
      "missingKeywords": ["<keyword1>", "<keyword2>"],
      "redundantPhrases": ["<phrase1>"],
      "suggestedKeywords": ["<keyword to add>"],
      "formattingIssues": ["<issue1>", "<issue2>"]
    },
    
    "interviewIntelligence": {
      "companySpecificQuestions": [{"company": "<company name>", "questions": ["<question1>", "<question2>"]}],
      "weaknessHandling": [{"weakness": "<identified weakness>", "strategy": "<how to address it>"}],
      "salaryNegotiationScript": ["<negotiation point1>", "<negotiation point2>"],
      "followUpTemplates": ["<follow up email template>"],
      "redFlagMitigation": ["<how to address potential red flags>"],
      "competencyGaps": ["<competency gaps to work on>"],
      "strongAnswerPoints": ["<strong points to highlight>"],
      "culturalFitIndicators": ["<cultural fit insights>"]
    },
    
    "marketInsights": {
      "jobOpenings": "<estimated job openings for this profile>",
      "hiringTrend": "<Hot/Active/Moderate/Slow>",
      "topHiringCompanies": ["<company1>", "<company2>", "<company3>"],
      "emergingRoles": ["<new role opportunities>"],
      "skillDemandForecast": [{"skill": "<skill>", "forecast": "<demand forecast>"}],
      "geographicHotspots": ["<city1>", "<city2>"],
      "industryGrowth": "<industry growth rate>",
      "competitionLevel": "<Low/Medium/High/Very High>"
    }
  }
}`;

function getDefaultAnalysis(): AnalysisResult {
    return {
        overallScore: 0,
        grade: "F",
        gradeDescription: "Unable to analyze resume. Please try again.",
        scores: {
            education: { score: 0, feedback: "Could not analyze" },
            experience: { score: 0, feedback: "Could not analyze" },
            technicalSkills: { score: 0, feedback: "Could not analyze" },
            projects: { score: 0, feedback: "Could not analyze" },
            presentation: { score: 0, feedback: "Could not analyze" }
        },
        profile: { name: "Not Found", email: "Not Found", phone: "Not Found", location: "Not Found", summary: "Unable to generate" },
        skills: { technical: [], languages: [], soft: [], mlAi: [], tools: [] },
        experience: [],
        education: [],
        projects: [],
        marketIntelligence: { salaryRange: "N/A", experienceLevel: "Entry", atsCompatibility: 0, marketDemand: "Low" },
        roleCompatibility: { fullstack: 0, frontend: 0, backend: 0, mobile: 0, devops: 0, datascience: 0, sde: 0 },
        strengths: [],
        weaknesses: ["Resume could not be analyzed"],
        proTips: ["Please ensure your resume is readable"],
        interviewPrep: { recruiterQuestions: [], technicalQuestions: [], behavioralQuestions: [], tips: [] }
    };
}

async function checkUserUsage(userId: string): Promise<{ canAnalyze: boolean; tier: string; remaining: number }> {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { canAnalyze: true, tier: "free", remaining: 1 };
        }
        const data = userDoc.data();
        const tier = data.tier || "free";
        const monthlyAnalyses = data.monthlyAnalyses || 0;
        const maxAnalyses = tier === "pro" ? 5 : 1;
        return {
            canAnalyze: monthlyAnalyses < maxAnalyses,
            tier,
            remaining: Math.max(0, maxAnalyses - monthlyAnalyses)
        };
    } catch {
        return { canAnalyze: true, tier: "free", remaining: 1 };
    }
}

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get("content-type") || "";
        const userId = request.headers.get("x-user-id") || "";

        let resumeText = "";
        let fileName = "Manual Input";
        let isPremium = false;

        // Check usage if user is logged in
        if (userId) {
            const usage = await checkUserUsage(userId);
            if (!usage.canAnalyze) {
                return NextResponse.json({
                    success: false,
                    error: "You've reached your monthly analysis limit. Upgrade to Pro for more analyses.",
                    limitReached: true
                }, { status: 403 });
            }
            isPremium = usage.tier === "pro";
        }

        // Parse request
        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file") as File;
            const premiumParam = formData.get("premium");

            if (premiumParam === "true") isPremium = true;

            if (!file) {
                return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
            }

            fileName = file.name;
            const buffer = Buffer.from(await file.arrayBuffer());

            console.log(`[Parser] Parsing: ${fileName}, size: ${buffer.length}`);
            const parsed = await parseResume(buffer, file.name);

            if (parsed.error && !parsed.text) {
                return NextResponse.json({ success: false, error: `Parse error: ${parsed.error}` }, { status: 400 });
            }
            resumeText = parsed.text;
        } else {
            try {
                const body = await request.json();
                resumeText = body.text || "";
                isPremium = body.premium || false;
            } catch {
                return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
            }
        }

        if (!resumeText || resumeText.trim().length < 50) {
            return NextResponse.json({ success: false, error: "Resume text too short" }, { status: 400 });
        }

        // Check if any AI provider is available
        const providers = getAvailableProviders();
        if (!providers.some(p => p.available)) {
            return NextResponse.json({ success: false, error: "No AI providers configured" }, { status: 500 });
        }

        let analysis: AnalysisResult;
        let usedProvider = "unknown";

        try {
            console.log(`[AI] Analyzing (Premium: ${isPremium})...`);

            const prompt = isPremium
                ? PREMIUM_ANALYSIS_PROMPT.replace("{RESUME_TEXT}", resumeText.substring(0, 10000))
                : ANALYSIS_PROMPT.replace("{RESUME_TEXT}", resumeText.substring(0, 8000));

            // Use multi-provider fallback
            const result = await callWithFallback({
                prompt,
                maxTokens: isPremium ? 5000 : 2500,
                temperature: 0.3,
                jsonMode: true,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            usedProvider = result.provider;
            const cleaned = cleanJsonResponse(result.text);
            analysis = JSON.parse(cleaned);
            console.log(`[AI] Success via ${usedProvider}`);

        } catch (aiError) {
            console.error("[AI] Error:", aiError);
            analysis = getDefaultAnalysis();
            analysis.gradeDescription = "AI analysis failed. Please retry.";
        }

        // Save to Firestore and update usage
        if (userId) {
            try {
                await addDoc(collection(db, "analyses"), {
                    userId,
                    fileName,
                    score: analysis.overallScore,
                    grade: analysis.grade,
                    isPremium,
                    data: analysis,
                    createdAt: serverTimestamp()
                });

                await updateDoc(doc(db, "users", userId), {
                    // Update both legacy and new fields for compatibility
                    monthlyAnalyses: increment(1),
                    "usage.resumeAnalyzer": increment(1),
                    "featureUsage.resumeAnalyzer": increment(1),
                    "featureUsage.lastUsed": serverTimestamp(),
                    lastAnalysisAt: serverTimestamp()
                }).catch(() => { });
            } catch (e) {
                console.error("[DB] Error:", e);
            }
        }

        return NextResponse.json({
            success: true,
            analysis,
            isPremium,
            resumePreview: resumeText.substring(0, 200) + "..."
        });

    } catch (error) {
        console.error("[API Error]", error);
        return NextResponse.json({
            success: false,
            error: "Analysis failed: " + (error as Error).message
        }, { status: 500 });
    }
}

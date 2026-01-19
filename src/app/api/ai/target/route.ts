import { NextRequest, NextResponse } from "next/server";

// Sample company data - In production, this would come from a database
const TOP_COMPANIES = [
    "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "Tesla", "Adobe",
    "Salesforce", "Oracle", "IBM", "Intel", "Cisco", "VMware", "Nvidia", "AMD",
    "TCS", "Infosys", "Wipro", "HCL", "Tech Mahindra", "Cognizant", "Accenture",
    "Deloitte", "PwC", "EY", "KPMG", "McKinsey", "BCG", "Bain",
    "Goldman Sachs", "Morgan Stanley", "JPMorgan", "Citibank", "HSBC", "Barclays",
    "Flipkart", "Paytm", "Razorpay", "Swiggy", "Zomato", "Ola", "PhonePe", "CRED",
    "Uber", "Airbnb", "Stripe", "Shopify", "Zoom", "Slack", "Atlassian", "GitHub",
];

export async function POST(request: NextRequest) {
    try {
        const { resumeText, targetCompany } = await request.json();

        if (!resumeText || !targetCompany) {
            return NextResponse.json(
                { error: "Resume text and target company are required" },
                { status: 400 }
            );
        }

        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey) {
            return NextResponse.json({
                tailoredResume: resumeText,
                suggestions: ["Configure GROQ_API_KEY for AI-powered suggestions"],
                keywords: [],
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
                        content: `You are an expert resume consultant specializing in tailoring resumes for specific companies. 

Your task:
1. Analyze the resume and the target company
2. Suggest improvements to match the company's culture and requirements
3. Recommend keywords that would help pass ATS systems at this company
4. Rewrite the professional summary to target this specific company

Return a JSON object with:
{
  "tailoredSummary": "New summary tailored for the company",
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "score": 85 // ATS compatibility score 0-100
}`,
                    },
                    {
                        role: "user",
                        content: `Target Company: ${targetCompany}\n\nResume:\n${resumeText}`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            throw new Error("AI API request failed");
        }

        const data = await response.json();
        const result = JSON.parse(data.choices[0]?.message?.content || "{}");

        return NextResponse.json(result);
    } catch (error) {
        console.error("AI target error:", error);
        return NextResponse.json(
            { error: "Failed to generate targeted suggestions" },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Return list of companies for search
    return NextResponse.json({ companies: TOP_COMPANIES });
}

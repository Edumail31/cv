"use client";

import { useState, useRef, useEffect } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import AnalyzingAnimation from "@/components/AnalyzingAnimation";
import AuthGuard from "@/components/AuthGuard";
import { Building2, Upload, FileText, X, Loader2, ChevronDown, ChevronUp, Crown, AlertTriangle, CheckCircle, XCircle, Target, TrendingUp, Zap, Search, RefreshCw, Check } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getStoredResume, saveResume, storedResumeToFile, hasStoredResume } from "@/lib/resume-storage";

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

const POPULAR_COMPANIES = [
    "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix",
    "Uber", "Airbnb", "Stripe", "Salesforce", "Adobe", "Oracle",
    "Infosys", "TCS", "Wipro", "Accenture", "Cognizant",
    "Flipkart", "Swiggy", "Zomato", "PhonePe", "Razorpay", "CRED"
];

export default function CompanyCompatibilityPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [userTier, setUserTier] = useState<"free" | "pro" | "premium">("free");
    const [resume, setResume] = useState<File | null>(null);
    const [company, setCompany] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);
    const [useStoredResume, setUseStoredResume] = useState(false);
    const [result, setResult] = useState<CompanyCompatibilityResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        setUserTier(userDoc.data().tier || "free");
                    }
                } catch (e) {
                    console.error("Error fetching user data:", e);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Check for stored resume on mount
    useEffect(() => {
        const stored = getStoredResume();
        if (stored) {
            setUseStoredResume(true);
            setResume(storedResumeToFile(stored));
        }
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setResume(file);
            setUseStoredResume(false);
            await saveResume(file);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setResume(file);
            setUseStoredResume(false);
            await saveResume(file);
        }
    };

    const handleAnalyze = async () => {
        if (!resume || !company) {
            setError("Please upload your resume and select a company");
            return;
        }

        setShowAnimation(true);
        setError(null);
        setResult(null);

        // Tier-based delay
        const tierDelay = userTier === "premium" ? 3000 : userTier === "pro" ? 7000 : 10000;

        try {
            const formData = new FormData();
            formData.append("resume", resume);
            formData.append("company", company);
            formData.append("targetRole", targetRole || "Software Engineer");
            if (user) formData.append("userId", user.uid);
            // Pass user tier for Firestore permission fallback
            if (userTier) formData.append("userPlan", userTier);

            const [response] = await Promise.all([
                fetch("/api/ai/company", {
                    method: "POST",
                    body: formData,
                }),
                new Promise(resolve => setTimeout(resolve, tierDelay))
            ]);

            const data = await response.json();

            if (!response.ok) {
                if (data.requiresUpgrade) {
                    setError(data.error);
                } else {
                    throw new Error(data.error || "Analysis failed");
                }
                return;
            }

            setResult(data.result);
            if (data.result.categories.length > 0) {
                setExpandedCategories([data.result.categories[0].category]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to analyze compatibility");
        } finally {
            setIsLoading(false);
            setShowAnimation(false);
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "#22c55e";
        if (score >= 60) return "#84cc16";
        if (score >= 40) return "#eab308";
        return "#ef4444";
    };

    const getClassificationColor = (classification: string) => {
        if (classification === "Strong Fit") return "#22c55e";
        if (classification === "Good Fit") return "#84cc16";
        if (classification === "Risky") return "#f59e0b";
        return "#ef4444";
    };

    const getPriorityColor = (priority: string) => {
        if (priority === "High") return "#ef4444";
        if (priority === "Medium") return "#f59e0b";
        return "#22c55e";
    };

    const filteredCompanies = POPULAR_COMPANIES.filter(c =>
        c.toLowerCase().includes(company.toLowerCase())
    );

    const styles = {
        container: { padding: "var(--space-8)", minHeight: "100vh", background: "var(--bg-primary)" },
        header: { marginBottom: "var(--space-6)" },
        title: { fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" },
        subtitle: { color: "var(--text-secondary)", fontSize: "0.95rem" },
        uploadZone: { padding: "var(--space-8)", background: "var(--bg-secondary)", border: "2px dashed var(--border-color)", borderRadius: "16px", textAlign: "center" as const, cursor: "pointer", marginBottom: "16px" },
        uploadZoneActive: { borderColor: "#6366f1", background: "rgba(99, 102, 241, 0.1)" },
        filePreview: { display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.3)" },
        input: { width: "100%", padding: "12px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "16px" },
        inputWrapper: { position: "relative" as const, marginBottom: "16px" },
        dropdown: { position: "absolute" as const, top: "100%", left: 0, right: 0, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", maxHeight: "200px", overflowY: "auto" as const, zIndex: 10 },
        dropdownItem: { padding: "10px 16px", cursor: "pointer", fontSize: "0.9rem", borderBottom: "1px solid var(--border-color)" },
        button: { width: "100%", padding: "16px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
        resultCard: { background: "var(--bg-secondary)", borderRadius: "20px", padding: "var(--space-6)", marginTop: "24px", border: "1px solid var(--border-color)" },
        scoreGauge: { width: "180px", height: "180px", borderRadius: "50%", position: "relative" as const, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" },
        categoryCard: { background: "var(--bg-tertiary)", borderRadius: "16px", marginBottom: "12px", overflow: "hidden", border: "1px solid var(--border-color)" },
        categoryHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer" },
        parameterRow: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.03)" },
        badge: { padding: "4px 10px", borderRadius: "100px", fontSize: "0.7rem", fontWeight: 600 },
        premiumBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 12px", background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600 },
    };

    // Auth Loading State
    if (authLoading) {
        return (
            <SidebarLayout>
                <div style={styles.container}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{
                                width: "60px",
                                height: "60px",
                                border: "3px solid rgba(99, 102, 241, 0.3)",
                                borderTopColor: "#6366f1",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                                margin: "0 auto 16px"
                            }} />
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading...</p>
                        </div>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    // Not authenticated
    if (!user) {
        return (
            <SidebarLayout>
                <AuthGuard>
                    <div />
                </AuthGuard>
            </SidebarLayout>
        );
    }

    // Locked state for free users
    if (userTier === "free") {
        return (
            <SidebarLayout>
                <div style={styles.container}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
                        <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                            <Building2 size={40} />
                        </div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "16px" }}>Company Compatibility</h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginBottom: "24px", lineHeight: 1.6 }}>
                            Check how well your resume matches specific companies. Get insights on skill gaps, culture fit, and personalized recommendations.
                        </p>
                        <div style={styles.premiumBadge}>
                            <Crown size={14} />
                            Pro & Premium Feature
                        </div>
                        <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                            {POPULAR_COMPANIES.slice(0, 8).map(c => (
                                <span key={c} style={{ ...styles.badge, background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>{c}</span>
                            ))}
                        </div>
                        <button
                            onClick={() => window.location.href = "/pricing"}
                            style={{ ...styles.button, maxWidth: "200px", marginTop: "24px" }}
                        >
                            Upgrade Now
                        </button>
                    </div>
                </div>
            </SidebarLayout>
        );
    }

    return (
        <SidebarLayout>
            <AnalyzingAnimation
                isVisible={showAnimation}
                tier={userTier}
                featureName="Company Fit"
            />

            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        <Building2 size={28} color="#6366f1" />
                        Company Compatibility
                        {userTier === "premium" && (
                            <span style={styles.premiumBadge}><Crown size={12} /> Premium</span>
                        )}
                    </h1>
                    <p style={styles.subtitle}>Analyze how well your resume fits specific companies and get actionable recommendations</p>
                </div>

                {/* Input Section */}
                {!result && (
                    <>
                        {/* Stored Resume Option */}
                        {hasStoredResume() && useStoredResume && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 16px",
                                background: "rgba(34, 197, 94, 0.1)",
                                borderRadius: "12px",
                                border: "1px solid rgba(34, 197, 94, 0.3)",
                                marginBottom: "16px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Check size={18} color="#22c55e" />
                                    <span style={{ fontSize: "0.9rem" }}>Using saved resume: <strong>{resume?.name}</strong></span>
                                </div>
                                <button
                                    onClick={() => { setUseStoredResume(false); setResume(null); }}
                                    style={{
                                        padding: "6px 12px",
                                        background: "var(--bg-tertiary)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "8px",
                                        color: "var(--text-primary)",
                                        fontSize: "0.8rem",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                >
                                    <RefreshCw size={14} /> Use Different Resume
                                </button>
                            </div>
                        )}

                        {(!useStoredResume || !resume) && (
                            <div
                                style={{ ...styles.uploadZone, ...(resume ? styles.uploadZoneActive : {}) }}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx,.doc"
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                                {resume ? (
                                    <div style={styles.filePreview}>
                                        <FileText size={24} color="#6366f1" />
                                        <div style={{ flex: 1, textAlign: "left" }}>
                                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Resume Uploaded</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{resume.name}</div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setResume(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: "12px" }} />
                                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Upload Your Resume</div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>PDF or DOCX format</div>
                                    </>
                                )}
                            </div>
                        )}

                        <div style={styles.inputWrapper}>
                            <div style={{ position: "relative" }}>
                                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                                <input
                                    type="text"
                                    placeholder="Search or enter company name..."
                                    value={company}
                                    onChange={(e) => { setCompany(e.target.value); setShowCompanyDropdown(true); }}
                                    onFocus={() => setShowCompanyDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                                    style={{ ...styles.input, paddingLeft: "42px", marginBottom: 0 }}
                                />
                            </div>
                            {showCompanyDropdown && filteredCompanies.length > 0 && (
                                <div style={styles.dropdown}>
                                    {filteredCompanies.map(c => (
                                        <div
                                            key={c}
                                            style={styles.dropdownItem}
                                            onClick={() => { setCompany(c); setShowCompanyDropdown(false); }}
                                            onMouseEnter={(e) => (e.target as HTMLElement).style.background = "var(--bg-tertiary)"}
                                            onMouseLeave={(e) => (e.target as HTMLElement).style.background = "transparent"}
                                        >
                                            {c}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <input
                            type="text"
                            placeholder="Target Role (e.g., Senior Software Engineer)"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            style={styles.input}
                        />

                        {error && (
                            <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", color: "#ef4444", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                <AlertTriangle size={20} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleAnalyze}
                            disabled={!resume || !company || isLoading}
                            style={{ ...styles.button, opacity: (!resume || !company || isLoading) ? 0.6 : 1 }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                                    Analyzing Compatibility...
                                </>
                            ) : (
                                <>
                                    <Target size={20} />
                                    Check Compatibility
                                </>
                            )}
                        </button>
                    </>
                )}

                {/* Results Section */}
                {result && (
                    <div style={styles.resultCard}>
                        {/* Score Gauge */}
                        <div style={styles.scoreGauge}>
                            <svg width="180" height="180" viewBox="0 0 180 180">
                                <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                                <circle
                                    cx="90" cy="90" r="80"
                                    fill="none"
                                    stroke={getScoreColor(result.overallScore)}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(result.overallScore / 100) * 502.4} 502.4`}
                                    transform="rotate(-90 90 90)"
                                    style={{ transition: "stroke-dasharray 1s ease" }}
                                />
                            </svg>
                            <div style={{ position: "absolute", textAlign: "center" }}>
                                <div style={{ fontSize: "2.5rem", fontWeight: 700, color: getScoreColor(result.overallScore) }}>{result.overallScore}</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>/ 100</div>
                            </div>
                        </div>

                        {/* Classification */}
                        <div style={{ textAlign: "center", marginBottom: "24px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 20px", background: `${getClassificationColor(result.classification)}20`, borderRadius: "100px", border: `1px solid ${getClassificationColor(result.classification)}40` }}>
                                {result.classification === "Strong Fit" || result.classification === "Good Fit" ? <CheckCircle size={18} color={getClassificationColor(result.classification)} /> : <XCircle size={18} color={getClassificationColor(result.classification)} />}
                                <span style={{ fontWeight: 600, color: getClassificationColor(result.classification) }}>{result.classification}</span>
                            </div>
                            <p style={{ marginTop: "16px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.verdict}</p>
                        </div>

                        {/* Strengths & Risks */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                            <div style={{ padding: "16px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <CheckCircle size={16} color="#22c55e" />
                                    <span style={{ fontWeight: 600, color: "#22c55e" }}>Strengths</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                                    {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                            <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <AlertTriangle size={16} color="#ef4444" />
                                    <span style={{ fontWeight: 600, color: "#ef4444" }}>Risks</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                                    {result.risks.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px" }}>Detailed Analysis</h3>
                        {result.categories.map((cat) => (
                            <div key={cat.category} style={styles.categoryCard}>
                                <div style={styles.categoryHeader} onClick={() => toggleCategory(cat.category)}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span style={{ fontWeight: 600 }}>{cat.category}</span>
                                        <span style={{ ...styles.badge, background: `${getScoreColor(cat.score)}20`, color: getScoreColor(cat.score) }}>{cat.score}/100</span>
                                    </div>
                                    {expandedCategories.includes(cat.category) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>

                                {expandedCategories.includes(cat.category) && (
                                    <div style={{ borderTop: "1px solid var(--border-color)" }}>
                                        {cat.parameters.map((param, idx) => (
                                            <div key={idx} style={styles.parameterRow}>
                                                <div style={{ width: "140px", fontSize: "0.85rem", fontWeight: 500 }}>{param.name}</div>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                                                        <div style={{ width: `${param.score}%`, height: "100%", background: getScoreColor(param.score), borderRadius: "3px" }} />
                                                    </div>
                                                    <span style={{ fontSize: "0.75rem", width: "30px", color: getScoreColor(param.score) }}>{param.score}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Recommendations */}
                        {result.recommendations.length > 0 && (
                            <div style={{ marginTop: "24px", padding: "20px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "16px", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <TrendingUp size={18} color="#6366f1" />
                                    <span style={{ fontWeight: 600, color: "#6366f1" }}>Recommendations</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                                    {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Premium Insights */}
                        {result.premiumInsights && (
                            <div style={{ marginTop: "24px", padding: "20px", background: "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.1))", borderRadius: "16px", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                                    <Crown size={18} color="#a855f7" />
                                    <span style={{ fontWeight: 600, color: "#a855f7" }}>Premium Insights</span>
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ fontWeight: 600, marginBottom: "8px" }}>Recruiter Mindset</div>
                                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>{result.premiumInsights.recruiterMindset}</p>
                                </div>

                                {result.premiumInsights.skillGapMap.length > 0 && (
                                    <div style={{ marginBottom: "16px" }}>
                                        <div style={{ fontWeight: 600, marginBottom: "12px" }}>Skill Gap Map</div>
                                        {result.premiumInsights.skillGapMap.map((sg, idx) => (
                                            <div key={idx} style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "8px", marginBottom: "8px" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                                    <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{sg.skill}</span>
                                                    <span style={{ ...styles.badge, background: `${getPriorityColor(sg.priority)}20`, color: getPriorityColor(sg.priority) }}>{sg.priority} Priority</span>
                                                </div>
                                                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>{sg.learningPath}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ fontWeight: 600, marginBottom: "8px" }}>Positioning Strategy</div>
                                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>{result.premiumInsights.positioningStrategy}</p>
                                </div>

                                {result.premiumInsights.competitiveEdge.length > 0 && (
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                            <Zap size={16} color="#22c55e" />
                                            <span style={{ fontWeight: 600 }}>Your Competitive Edge</span>
                                        </div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                            {result.premiumInsights.competitiveEdge.map((ce, i) => (
                                                <span key={i} style={{ ...styles.badge, background: "rgba(34, 197, 94, 0.2)", color: "#22c55e" }}>{ce}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Analysis Button */}
                        <button
                            onClick={() => { setResult(null); setResume(null); setCompany(""); setTargetRole(""); }}
                            style={{ ...styles.button, marginTop: "24px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}
                        >
                            Check Another Company
                        </button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </SidebarLayout>
    );
}

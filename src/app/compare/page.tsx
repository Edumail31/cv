"use client";

import { useState, useRef, useEffect } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import AnalyzingAnimation from "@/components/AnalyzingAnimation";
import AuthGuard from "@/components/AuthGuard";
import { BarChart3, Upload, FileText, X, Loader2, Trophy, TrendingUp, AlertTriangle, Crown, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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

export default function ResumeComparisonsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [userTier, setUserTier] = useState<"free" | "pro" | "premium">("free");
    const [resumeA, setResumeA] = useState<File | null>(null);
    const [resumeB, setResumeB] = useState<File | null>(null);
    const [targetRole, setTargetRole] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<string[]>(["Technical Strength", "Project Quality", "Experience & Impact"]);

    const fileInputARef = useRef<HTMLInputElement>(null);
    const fileInputBRef = useRef<HTMLInputElement>(null);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "A" | "B") => {
        const file = e.target.files?.[0];
        if (file) {
            if (side === "A") setResumeA(file);
            else setResumeB(file);
        }
    };

    const handleDrop = (e: React.DragEvent, side: "A" | "B") => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (side === "A") setResumeA(file);
            else setResumeB(file);
        }
    };

    const handleCompare = async () => {
        if (!resumeA || !resumeB) {
            setError("Please upload both resumes to compare");
            return;
        }

        setShowAnimation(true);
        setError(null);
        setResult(null);

        // Tier-based delay
        const tierDelay = userTier === "premium" ? 3000 : userTier === "pro" ? 7000 : 10000;

        try {
            const formData = new FormData();
            formData.append("resumeA", resumeA);
            formData.append("resumeB", resumeB);
            formData.append("targetRole", targetRole || "Software Engineer");
            if (user) formData.append("userId", user.uid);
            // Pass user tier for Firestore permission fallback
            if (userTier) formData.append("userPlan", userTier);

            const [response] = await Promise.all([
                fetch("/api/ai/compare", {
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
                    throw new Error(data.error || "Comparison failed");
                }
                return;
            }

            setResult(data.result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to compare resumes");
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
        if (score >= 20) return "#f97316";
        return "#ef4444";
    };

    const getWinnerBadge = (winner: "A" | "B" | "TIE") => {
        if (winner === "TIE") return { text: "TIE", color: "#6b7280" };
        if (winner === "A") return { text: "Resume A Wins", color: "#6366f1" };
        return { text: "Resume B Wins", color: "#8b5cf6" };
    };

    const groupParametersByCategory = (params: ComparisonParameter[]) => {
        const groups: Record<string, ComparisonParameter[]> = {};
        params.forEach(param => {
            if (!groups[param.category]) groups[param.category] = [];
            groups[param.category].push(param);
        });
        return groups;
    };

    const styles = {
        container: { padding: "var(--space-8)", minHeight: "100vh", background: "var(--bg-primary)" },
        header: { marginBottom: "var(--space-6)" },
        title: { fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" },
        subtitle: { color: "var(--text-secondary)", fontSize: "0.95rem" },
        uploadGrid: { display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: "var(--space-4)", marginBottom: "var(--space-6)", alignItems: "center" },
        uploadZone: { padding: "var(--space-8)", background: "var(--bg-secondary)", border: "2px dashed var(--border-color)", borderRadius: "16px", textAlign: "center" as const, cursor: "pointer", transition: "all 0.2s ease" },
        uploadZoneActive: { borderColor: "#6366f1", background: "rgba(99, 102, 241, 0.1)" },
        vsCircle: { width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.875rem" },
        filePreview: { display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.3)" },
        input: { width: "100%", padding: "12px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "var(--space-4)" },
        button: { width: "100%", padding: "16px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
        resultCard: { background: "var(--bg-secondary)", borderRadius: "20px", padding: "var(--space-6)", marginTop: "var(--space-6)", border: "1px solid var(--border-color)" },
        scoreCard: { flex: 1, padding: "var(--space-6)", background: "var(--bg-tertiary)", borderRadius: "16px", textAlign: "center" as const },
        parameterRow: { display: "flex", alignItems: "center", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
        progressBar: { height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.1)", overflow: "hidden" as const },
        categoryHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: "12px", cursor: "pointer", marginBottom: "8px" },
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
    if (userTier === "free" && !result) {
        return (
            <SidebarLayout>
                <div style={styles.container}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
                        <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                            <BarChart3 size={40} />
                        </div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "16px" }}>Resume Comparison</h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginBottom: "24px", lineHeight: 1.6 }}>
                            Compare two resumes side-by-side using 20+ hiring signal parameters. See which resume performs better for a specific role.
                        </p>
                        <div style={styles.premiumBadge}>
                            <Crown size={14} />
                            Pro & Premium Feature
                        </div>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "16px" }}>
                            Free users get 1 partial comparison per month
                        </p>
                        <button
                            onClick={() => setUserTier("pro")} // Temporary for testing
                            style={{ ...styles.button, maxWidth: "200px", marginTop: "24px" }}
                        >
                            Try it Now
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
                featureName="Resume Comparison"
            />

            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        <BarChart3 size={28} color="#6366f1" />
                        Resume Comparison
                    </h1>
                    <p style={styles.subtitle}>Compare two resumes to determine the stronger candidate for a role</p>
                </div>

                {/* Upload Section */}
                {!result && (
                    <>
                        <div style={styles.uploadGrid}>
                            {/* Resume A */}
                            <div
                                style={{ ...styles.uploadZone, ...(resumeA ? styles.uploadZoneActive : {}) }}
                                onClick={() => fileInputARef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, "A")}
                            >
                                <input
                                    ref={fileInputARef}
                                    type="file"
                                    accept=".pdf,.docx,.doc"
                                    onChange={(e) => handleFileChange(e, "A")}
                                    style={{ display: "none" }}
                                />
                                {resumeA ? (
                                    <div style={styles.filePreview}>
                                        <FileText size={24} color="#6366f1" />
                                        <div style={{ flex: 1, textAlign: "left" }}>
                                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Resume A</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{resumeA.name}</div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setResumeA(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: "12px" }} />
                                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Upload Resume A</div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>PDF or DOCX</div>
                                    </>
                                )}
                            </div>

                            {/* VS */}
                            <div style={styles.vsCircle}>VS</div>

                            {/* Resume B */}
                            <div
                                style={{ ...styles.uploadZone, ...(resumeB ? styles.uploadZoneActive : {}) }}
                                onClick={() => fileInputBRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, "B")}
                            >
                                <input
                                    ref={fileInputBRef}
                                    type="file"
                                    accept=".pdf,.docx,.doc"
                                    onChange={(e) => handleFileChange(e, "B")}
                                    style={{ display: "none" }}
                                />
                                {resumeB ? (
                                    <div style={styles.filePreview}>
                                        <FileText size={24} color="#8b5cf6" />
                                        <div style={{ flex: 1, textAlign: "left" }}>
                                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Resume B</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{resumeB.name}</div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setResumeB(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: "12px" }} />
                                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Upload Resume B</div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>PDF or DOCX</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Target Role (e.g., Senior Frontend Developer)"
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
                            onClick={handleCompare}
                            disabled={!resumeA || !resumeB || isLoading}
                            style={{ ...styles.button, opacity: (!resumeA || !resumeB || isLoading) ? 0.6 : 1 }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                                    Analyzing Resumes...
                                </>
                            ) : (
                                <>
                                    <BarChart3 size={20} />
                                    Compare Resumes
                                </>
                            )}
                        </button>
                    </>
                )}

                {/* Results Section */}
                {result && (
                    <div style={styles.resultCard}>
                        {/* Overall Scores */}
                        <div style={{ display: "flex", gap: "24px", marginBottom: "32px" }}>
                            <div style={styles.scoreCard}>
                                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Resume A</div>
                                <div style={{ fontSize: "3rem", fontWeight: 700, color: getScoreColor(result.overallScoreA), lineHeight: 1 }}>{result.overallScoreA}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>/100</div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <Trophy size={32} color={getWinnerBadge(result.winner).color} />
                                <div style={{ marginTop: "8px", padding: "6px 16px", background: getWinnerBadge(result.winner).color, borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>
                                    {getWinnerBadge(result.winner).text}
                                </div>
                            </div>

                            <div style={styles.scoreCard}>
                                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Resume B</div>
                                <div style={{ fontSize: "3rem", fontWeight: 700, color: getScoreColor(result.overallScoreB), lineHeight: 1 }}>{result.overallScoreB}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>/100</div>
                            </div>
                        </div>

                        {/* Verdict */}
                        <div style={{ padding: "20px", background: "var(--bg-tertiary)", borderRadius: "16px", marginBottom: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <TrendingUp size={18} color="#6366f1" />
                                <span style={{ fontWeight: 600 }}>Hiring Verdict</span>
                            </div>
                            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.verdict}</p>
                        </div>

                        {/* Parameters by Category */}
                        {Object.entries(groupParametersByCategory(result.parameters)).map(([category, params]) => (
                            <div key={category} style={{ marginBottom: "16px" }}>
                                <div style={styles.categoryHeader} onClick={() => toggleCategory(category)}>
                                    <span style={{ fontWeight: 600 }}>{category}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{params.length} parameters</span>
                                        {expandedCategories.includes(category) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {expandedCategories.includes(category) && (
                                    <div style={{ padding: "8px 16px" }}>
                                        {params.map((param, idx) => (
                                            <div key={idx} style={styles.parameterRow}>
                                                <div style={{ width: "180px", fontSize: "0.875rem", fontWeight: 500 }}>{param.name}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                        <span style={{ fontSize: "0.75rem", width: "20px" }}>A</span>
                                                        <div style={{ ...styles.progressBar, flex: 1 }}>
                                                            <div style={{ width: `${param.scoreA}%`, height: "100%", background: "#6366f1", borderRadius: "4px", transition: "width 0.5s ease" }} />
                                                        </div>
                                                        <span style={{ fontSize: "0.75rem", width: "30px", textAlign: "right", color: "#6366f1" }}>{param.scoreA}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <span style={{ fontSize: "0.75rem", width: "20px" }}>B</span>
                                                        <div style={{ ...styles.progressBar, flex: 1 }}>
                                                            <div style={{ width: `${param.scoreB}%`, height: "100%", background: "#8b5cf6", borderRadius: "4px", transition: "width 0.5s ease" }} />
                                                        </div>
                                                        <span style={{ fontSize: "0.75rem", width: "30px", textAlign: "right", color: "#8b5cf6" }}>{param.scoreB}</span>
                                                    </div>
                                                </div>
                                                <div style={{ width: "60px", textAlign: "center", padding: "4px 8px", background: param.winner === "TIE" ? "rgba(107, 114, 128, 0.2)" : param.winner === "A" ? "rgba(99, 102, 241, 0.2)" : "rgba(139, 92, 246, 0.2)", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, color: param.winner === "TIE" ? "#9ca3af" : param.winner === "A" ? "#6366f1" : "#8b5cf6" }}>
                                                    {param.winner}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

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

                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: "8px" }}>Positioning Advice</div>
                                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>{result.premiumInsights.positioningAdvice}</p>
                                </div>
                            </div>
                        )}

                        {/* New Comparison Button */}
                        <button
                            onClick={() => { setResult(null); setResumeA(null); setResumeB(null); setTargetRole(""); }}
                            style={{ ...styles.button, marginTop: "24px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}
                        >
                            Compare Different Resumes
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

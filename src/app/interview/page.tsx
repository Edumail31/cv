"use client";

import { useState, useRef, useEffect } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import AnalyzingAnimation from "@/components/AnalyzingAnimation";
import AuthGuard from "@/components/AuthGuard";
import { MessageSquare, Upload, FileText, X, ChevronDown, ChevronUp, Crown, AlertTriangle, Target, Brain, Lightbulb, Copy, Check, Download, Lock, RefreshCw } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { exportQuestionsToPDF, ExportQuestion } from "@/lib/pdf-export";
import { getStoredResume, saveResume, storedResumeToFile, hasStoredResume } from "@/lib/resume-storage";
import Link from "next/link";

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

type QuestionCategory = "all" | "technical" | "project" | "behavioral" | "scenario" | "trap" | "scaling";

export default function InterviewPrepPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [userTier, setUserTier] = useState<"free" | "pro" | "premium">("free");
    const [resume, setResume] = useState<File | null>(null);
    const [targetRole, setTargetRole] = useState("");
    const [questionCount, setQuestionCount] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);
    const [result, setResult] = useState<InterviewResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<QuestionCategory>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [useStoredResume, setUseStoredResume] = useState(false);
    const questionsPerPage = 10;

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

    const handleGenerate = async () => {
        if (!resume) {
            setError("Please upload your resume first");
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
            formData.append("targetRole", targetRole || "Software Engineer");
            formData.append("questionCount", questionCount.toString());
            if (user) formData.append("userId", user.uid);
            // Pass user tier for Firestore permission fallback
            if (userTier) formData.append("userPlan", userTier);

            const [response] = await Promise.all([
                fetch("/api/ai/interview", {
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
                    throw new Error(data.error || "Failed to generate questions");
                }
                return;
            }

            setResult(data.result);
            setExpandedQuestions([0]);
            setCurrentPage(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate questions");
        } finally {
            setIsLoading(false);
            setShowAnimation(false);
        }
    };

    const toggleQuestion = (index: number) => {
        setExpandedQuestions(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const copyQuestion = (question: string, index: number) => {
        navigator.clipboard.writeText(question);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleExport = () => {
        if (!result) return;

        const exportData: ExportQuestion[] = result.questions.map((q, i) => ({
            number: i + 1,
            question: q.question,
            type: q.type,
            difficulty: q.difficulty,
            intent: q.intent,
            expectedAnswer: q.expectedAnswer,
            followUps: q.followUps
        }));

        exportQuestionsToPDF(exportData, targetRole || "Software Engineer");
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            technical: "#6366f1",
            project: "#8b5cf6",
            behavioral: "#22c55e",
            scenario: "#f59e0b",
            trap: "#ef4444",
            scaling: "#06b6d4"
        };
        return colors[type] || "#6b7280";
    };

    const getDifficultyColor = (difficulty: string) => {
        if (difficulty === "Easy") return "#22c55e";
        if (difficulty === "Medium") return "#f59e0b";
        return "#ef4444";
    };

    // Filter questions by category
    const filteredQuestions = result?.questions.filter(q =>
        activeCategory === "all" || q.type === activeCategory
    ) || [];

    // Paginate
    const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
    const paginatedQuestions = filteredQuestions.slice(
        (currentPage - 1) * questionsPerPage,
        currentPage * questionsPerPage
    );

    // Category counts
    const categoryCounts = result?.questions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>) || {};

    const styles = {
        container: { padding: "var(--space-8)", minHeight: "100vh", background: "var(--bg-primary)" },
        header: { marginBottom: "var(--space-6)" },
        title: { fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" },
        subtitle: { color: "var(--text-secondary)", fontSize: "0.95rem" },
        uploadZone: { padding: "var(--space-8)", background: "var(--bg-secondary)", border: "2px dashed var(--border-color)", borderRadius: "16px", textAlign: "center" as const, cursor: "pointer", marginBottom: "16px" },
        uploadZoneActive: { borderColor: "#f59e0b", background: "rgba(245, 158, 11, 0.1)" },
        filePreview: { display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.3)" },
        input: { width: "100%", padding: "12px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "16px" },
        inputRow: { display: "flex", gap: "16px", marginBottom: "16px" },
        button: { width: "100%", padding: "16px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
        resultCard: { background: "var(--bg-secondary)", borderRadius: "20px", padding: "var(--space-6)", marginTop: "24px", border: "1px solid var(--border-color)" },
        questionCard: { background: "var(--bg-tertiary)", borderRadius: "12px", marginBottom: "8px", overflow: "hidden", border: "1px solid var(--border-color)" },
        questionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer" },
        questionBody: { padding: "0 16px 16px", borderTop: "1px solid var(--border-color)" },
        badge: { padding: "3px 8px", borderRadius: "100px", fontSize: "0.65rem", fontWeight: 600 },
        statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" },
        statCard: { padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", textAlign: "center" as const },
        premiumBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 12px", background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600 },
        categoryTabs: { display: "flex", gap: "8px", flexWrap: "wrap" as const, marginBottom: "16px" },
        categoryTab: { padding: "8px 16px", borderRadius: "100px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, transition: "all 0.2s" },
        pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "16px" },
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
                                border: "3px solid rgba(245, 158, 11, 0.3)",
                                borderTopColor: "#f59e0b",
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
                        <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                            <MessageSquare size={40} />
                        </div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "16px" }}>Interview Prep AI</h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginBottom: "24px", lineHeight: 1.6 }}>
                            Get <strong>up to 20 personalized questions</strong> (Pro) or <strong>up to 50 questions</strong> (Premium) based on YOUR resume. Each question targets specific claims and experiences.
                        </p>
                        <div style={styles.premiumBadge}>
                            <Crown size={14} />
                            Pro & Premium Feature
                        </div>
                        <div style={{ marginTop: "24px", textAlign: "left", width: "100%" }}>
                            <div style={{ fontWeight: 600, marginBottom: "12px" }}>What you get:</div>
                            <ul style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.8 }}>
                                <li>✓ 20 questions for Pro, 50 for Premium</li>
                                <li>✓ Targeted questions based on your experience</li>
                                <li>✓ Difficulty levels (Easy, Medium, Hard)</li>
                                <li style={{ color: "#a855f7" }}>★ Expected answers (Premium)</li>
                                <li style={{ color: "#a855f7" }}>★ Export to PDF (Premium)</li>
                            </ul>
                        </div>
                        <Link href="/pricing" style={{ ...styles.button, maxWidth: "200px", marginTop: "24px", textDecoration: "none" }}>
                            Upgrade Now
                        </Link>
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
                featureName="Interview Questions"
            />

            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        <MessageSquare size={28} color="#f59e0b" />
                        Interview Prep AI
                        {userTier === "premium" && (
                            <span style={styles.premiumBadge}><Crown size={12} /> Premium</span>
                        )}
                    </h1>
                    <p style={styles.subtitle}>Generate personalized interview questions tailored to your resume and target role</p>
                </div>

                {/* Upload Section */}
                {!result && (
                    <>
                        {/* Check Another Resume Option */}
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
                                        <FileText size={24} color="#f59e0b" />
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

                        <div style={styles.inputRow}>
                            <input
                                type="text"
                                placeholder="Target Role (e.g., Senior Backend Developer)"
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                                style={{ ...styles.input, flex: 2, marginBottom: 0 }}
                            />
                            <select
                                value={questionCount}
                                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                style={{ ...styles.input, flex: 1, marginBottom: 0, cursor: "pointer" }}
                            >
                                <option value={10}>10 Questions</option>
                                {userTier === "pro" && (
                                    <option value={20}>20 Questions (Pro Max)</option>
                                )}
                                {userTier === "premium" && (
                                    <>
                                        <option value={20}>20 Questions</option>
                                        <option value={30}>30 Questions</option>
                                        <option value={50}>50 Questions (Premium Max)</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {error && (
                            <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", color: "#ef4444", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                <AlertTriangle size={20} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={!resume || isLoading}
                            style={{ ...styles.button, opacity: (!resume || isLoading) ? 0.6 : 1 }}
                        >
                            <Brain size={20} />
                            Generate Interview Questions
                        </button>
                    </>
                )}

                {/* Results Section */}
                {result && (
                    <div style={styles.resultCard}>
                        {/* Stats Grid */}
                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}>
                                <Target size={24} color="#f59e0b" style={{ marginBottom: "8px" }} />
                                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{result.totalQuestions}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Questions</div>
                            </div>
                            <div style={styles.statCard}>
                                <Brain size={24} color="#6366f1" style={{ marginBottom: "8px" }} />
                                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{result.overallPreparedness}%</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Preparedness</div>
                            </div>
                            <div style={styles.statCard}>
                                <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: "8px" }} />
                                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{result.weaknessAreas.length}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Weak Areas</div>
                            </div>
                        </div>

                        {/* Export Button */}
                        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                            {userTier === "premium" ? (
                                <button
                                    onClick={handleExport}
                                    style={{
                                        padding: "12px 24px",
                                        background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                        border: "none",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}
                                >
                                    <Download size={18} />
                                    Export to PDF
                                </button>
                            ) : (
                                <Link href="/pricing" style={{
                                    padding: "12px 24px",
                                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                                    border: "none",
                                    borderRadius: "12px",
                                    color: "#fff",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    textDecoration: "none",
                                    animation: "pulse 2s infinite"
                                }}>
                                    <Lock size={16} />
                                    <Crown size={16} />
                                    Upgrade to Export PDF
                                </Link>
                            )}
                            <button
                                onClick={() => { setResult(null); setResume(null); setTargetRole(""); }}
                                style={{
                                    padding: "12px 24px",
                                    background: "var(--bg-tertiary)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "12px",
                                    color: "var(--text-primary)",
                                    fontSize: "0.9rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
                                }}
                            >
                                <RefreshCw size={18} />
                                New Session
                            </button>
                        </div>

                        {/* Category Tabs */}
                        <div style={styles.categoryTabs}>
                            {[
                                { key: "all" as QuestionCategory, label: "All", count: result.questions.length },
                                { key: "technical" as QuestionCategory, label: "Technical", count: categoryCounts.technical || 0 },
                                { key: "project" as QuestionCategory, label: "Project", count: categoryCounts.project || 0 },
                                { key: "behavioral" as QuestionCategory, label: "Behavioral", count: categoryCounts.behavioral || 0 },
                                { key: "scenario" as QuestionCategory, label: "Scenario", count: categoryCounts.scenario || 0 },
                                { key: "trap" as QuestionCategory, label: "Trap", count: categoryCounts.trap || 0 },
                            ].filter(cat => cat.count > 0 || cat.key === "all").map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => { setActiveCategory(cat.key); setCurrentPage(1); }}
                                    style={{
                                        ...styles.categoryTab,
                                        background: activeCategory === cat.key ? getTypeColor(cat.key === "all" ? "technical" : cat.key) : "var(--bg-tertiary)",
                                        color: activeCategory === cat.key ? "#fff" : "var(--text-primary)",
                                        borderColor: activeCategory === cat.key ? "transparent" : "var(--border-color)"
                                    }}
                                >
                                    {cat.label} ({cat.count})
                                </button>
                            ))}
                        </div>

                        {/* Questions List - Compact for many questions */}
                        <div>
                            {paginatedQuestions.map((q, localIdx) => {
                                const globalIdx = (currentPage - 1) * questionsPerPage + localIdx;
                                return (
                                    <div key={globalIdx} style={styles.questionCard}>
                                        <div style={styles.questionHeader} onClick={() => toggleQuestion(globalIdx)}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                                                <span style={{
                                                    minWidth: "28px",
                                                    height: "28px",
                                                    borderRadius: "8px",
                                                    background: getTypeColor(q.type),
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                    color: "#fff"
                                                }}>
                                                    {globalIdx + 1}
                                                </span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: "4px" }}>{q.question}</div>
                                                    <div style={{ display: "flex", gap: "6px" }}>
                                                        <span style={{ ...styles.badge, background: `${getTypeColor(q.type)}25`, color: getTypeColor(q.type) }}>{q.type}</span>
                                                        <span style={{ ...styles.badge, background: `${getDifficultyColor(q.difficulty)}25`, color: getDifficultyColor(q.difficulty) }}>{q.difficulty}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <button onClick={(e) => { e.stopPropagation(); copyQuestion(q.question, globalIdx); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }}>
                                                    {copiedIndex === globalIdx ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                                                </button>
                                                {expandedQuestions.includes(globalIdx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>

                                        {expandedQuestions.includes(globalIdx) && (
                                            <div style={styles.questionBody}>
                                                <div style={{ marginTop: "12px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                                        <Lightbulb size={14} color="#f59e0b" />
                                                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>What they're looking for:</span>
                                                    </div>
                                                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>{q.intent}</p>
                                                </div>

                                                {q.expectedAnswer && (
                                                    <div style={{ marginTop: "12px", padding: "12px", background: "rgba(168, 85, 247, 0.1)", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                                            <Crown size={12} color="#a855f7" />
                                                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#a855f7" }}>Ideal Answer</span>
                                                        </div>
                                                        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", lineHeight: 1.5 }}>{q.expectedAnswer}</p>
                                                    </div>
                                                )}

                                                {q.followUps && q.followUps.length > 0 && (
                                                    <div style={{ marginTop: "12px" }}>
                                                        <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px", color: "#a855f7" }}>Follow-ups:</div>
                                                        <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                                                            {q.followUps.map((fu, i) => (
                                                                <li key={i} style={{ marginBottom: "2px" }}>{fu}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: "8px 16px",
                                        background: "var(--bg-tertiary)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "8px",
                                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                        opacity: currentPage === 1 ? 0.5 : 1
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ padding: "0 16px", fontSize: "0.9rem" }}>
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: "8px 16px",
                                        background: "var(--bg-tertiary)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "8px",
                                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                                        opacity: currentPage === totalPages ? 0.5 : 1
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {/* Weakness Areas */}
                        {result.weaknessAreas.length > 0 && (
                            <div style={{ marginTop: "20px", padding: "16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                                <div style={{ fontWeight: 600, marginBottom: "8px", color: "#ef4444" }}>Areas Interviewers May Target</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {result.weaknessAreas.map((area, idx) => (
                                        <span key={idx} style={{ ...styles.badge, background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "6px 12px" }}>{area}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tips */}
                        {result.tips.length > 0 && (
                            <div style={{ marginTop: "16px", padding: "16px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                                <div style={{ fontWeight: 600, marginBottom: "8px", color: "#22c55e" }}>💡 Preparation Tips</div>
                                <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                                    {result.tips.map((tip, idx) => (
                                        <li key={idx}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
            `}</style>
        </SidebarLayout>
    );
}

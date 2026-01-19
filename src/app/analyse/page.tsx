"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } from "firebase/firestore";
import SidebarLayout from "@/components/SidebarLayout";
import AuthGuard from "@/components/AuthGuard";
import LazySection from "@/components/LazySection";
import FeatureBanner from "@/components/FeatureBanner";
import ResumeGenerator from "@/components/ResumeGenerator";
import ExportOptions from "@/components/ExportOptions";
import {
    Upload, FileText, Loader2, CheckCircle, AlertCircle, BarChart3,
    User as UserIcon, Lightbulb, MessageSquare, Download, Star, Target, TrendingUp,
    Briefcase, GraduationCap, Code, Zap, RefreshCw, Plus, Award,
    DollarSign, Shield, ChevronRight, Home, ArrowLeft, Lock, Crown,
    FileDown, Globe, Sparkles
} from "lucide-react";

interface AnalysisResult {
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
    // Premium fields
    premiumAnalysis?: {
        skillsMarketDemand: Array<{ skill: string; demand: string; trend: string }>;
        careerTrajectory: string[];
        compensationDetails: { base: string; bonus: string; equity: string; total: string };
        atsOptimization: { keywords: string[]; missingKeywords: string[]; formatScore: number };
        companyRecommendations: string[];
    };
}

export default function AnalysePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [dragActive, setDragActive] = useState(false);
    const [userTier, setUserTier] = useState<"free" | "pro" | "premium">("free");
    const [usageCount, setUsageCount] = useState(0);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [generatedResume, setGeneratedResume] = useState<any>(null);
    const [exportsUsed, setExportsUsed] = useState(0);

    const componentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);

            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserTier(data.tier || "free");
                        // Check both usage structures
                        const usage = data.featureUsage?.resumeAnalyzer || data.usage?.resumeAnalyzer || data.monthlyAnalyses || 0;
                        setUsageCount(usage);
                        // Set exports usage
                        const exports = data.featureUsage?.resumeExports || data.usage?.resumeExports || 0;
                        setExportsUsed(exports);
                    }
                } catch (e) {
                    console.error("Error fetching user tier:", e);
                }

                // Restore analysis from sessionStorage if available (for reload/back navigation)
                try {
                    const cached = sessionStorage.getItem(`analysis_${currentUser.uid}`);
                    if (cached && !analysis) {
                        const parsedAnalysis = JSON.parse(cached);
                        setAnalysis(parsedAnalysis);
                    }
                } catch (e) {
                    console.error("Error restoring cached analysis:", e);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Use correct limits from PLAN_LIMITS - Pro gets 20, Free gets 3, Premium gets unlimited
    const planLimit = userTier === "premium" ? Infinity : (userTier === "pro" ? 20 : 3);
    const canAnalyze = usageCount < planLimit;

    const handlePrint = useReactToPrint({ contentRef: componentRef, documentTitle: `Resume_Analysis_${analysis?.profile.name || 'Report'}` });

    const triggerFileInput = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        fileInputRef.current?.click();
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0]);
            setError(null);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        if (!canAnalyze) {
            setShowUpgradeModal(true);
            return;
        }

        setAnalyzing(true);
        setError(null);

        // Minimum 2 second animation + actual API time
        const startTime = Date.now();
        const minAnimationTime = 2000;

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("premium", String(userTier === "pro"));

            const response = await fetch("/api/ai/analyse", {
                method: "POST",
                body: formData,
                headers: { "x-user-id": auth.currentUser?.uid || "" },
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Analysis failed");

            // Ensure minimum animation time
            const elapsed = Date.now() - startTime;
            if (elapsed < minAnimationTime) {
                await new Promise(resolve => setTimeout(resolve, minAnimationTime - elapsed));
            }

            setAnalysis(data.analysis);

            // Cache analysis in sessionStorage for reload/back navigation persistence
            if (auth.currentUser) {
                try {
                    sessionStorage.setItem(`analysis_${auth.currentUser.uid}`, JSON.stringify(data.analysis));
                } catch (e) {
                    console.error("Error caching analysis:", e);
                }
            }

            // Save analysis to Firestore for history
            if (auth.currentUser) {
                try {
                    await addDoc(collection(db, "analyses"), {
                        userId: auth.currentUser.uid,
                        fileName: file.name,
                        score: data.analysis.overallScore || 0,
                        grade: data.analysis.grade || "N/A",
                        createdAt: serverTimestamp(),
                    });
                } catch (saveErr) {
                    console.error("Error saving analysis to history:", saveErr);
                }
            }

            // Update usage count
            if (auth.currentUser) {
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    monthlyAnalyses: increment(1)
                }).catch(() => { });
                setUsageCount(prev => prev + 1);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setAnalyzing(false);
        }
    };

    const resetAnalysis = () => {
        setFile(null);
        setAnalysis(null);
        setError(null);
        setActiveTab("overview");
        // Clear cached analysis when user explicitly resets
        if (auth.currentUser) {
            try {
                sessionStorage.removeItem(`analysis_${auth.currentUser.uid}`);
            } catch (e) {
                // Ignore errors
            }
        }
    };

    const getGradeColor = (grade: string) => {
        const colors: Record<string, string> = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };
        return colors[grade] || "#6b7280";
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "#22c55e";
        if (score >= 60) return "#84cc16";
        if (score >= 40) return "#eab308";
        if (score >= 20) return "#f97316";
        return "#ef4444";
    };

    const tabs = [
        { id: "overview", label: "Score & Overview", icon: <BarChart3 size={18} /> },
        { id: "profile", label: "Profile Details", icon: <UserIcon size={18} /> },
        { id: "insights", label: "Insights & Tips", icon: <Lightbulb size={18} />, premium: true },
        { id: "interview", label: "Interview Prep", icon: <MessageSquare size={18} /> },
        { id: "export", label: "Export Report", icon: <Download size={18} /> },
    ];

    // Upgrade Modal
    const UpgradeModal = () => (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
        }} onClick={() => setShowUpgradeModal(false)}>
            <div style={{
                background: "#fff", borderRadius: "20px", padding: "40px",
                maxWidth: "500px", textAlign: "center"
            }} onClick={e => e.stopPropagation()}>
                <Crown size={48} style={{ color: "#f59e0b", marginBottom: "16px" }} />
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px", color: "#111" }}>
                    Upgrade to Pro
                </h2>
                <p style={{ color: "#6b7280", marginBottom: "24px" }}>
                    You&apos;ve used your free analysis. Upgrade to Pro for 5 analyses/month and premium features!
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button onClick={() => setShowUpgradeModal(false)} style={{
                        padding: "12px 24px", background: "#f3f4f6", border: "none",
                        borderRadius: "8px", cursor: "pointer"
                    }}>
                        Maybe Later
                    </button>
                    <button onClick={() => router.push("/pricing")} style={{
                        padding: "12px 24px", background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "8px"
                    }}>
                        <Crown size={18} /> View Plans
                    </button>
                </div>
            </div>
        </div>
    );

    // Auth Loading State
    if (authLoading) {
        return (
            <SidebarLayout>
                <div style={{
                    minHeight: "100vh",
                    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
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
                        <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Loading...</p>
                    </div>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
            </SidebarLayout>
        );
    }

    // Not authenticated - show login prompt
    if (!user) {
        return (
            <SidebarLayout>
                <AuthGuard>
                    <div />
                </AuthGuard>
            </SidebarLayout>
        );
    }

    // Analyzing Animation
    if (analyzing) {
        return (
            <SidebarLayout>
                <div style={{
                    minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div style={{ textAlign: "center" }}>
                        {/* Animated Circle */}
                        <div style={{
                            width: "120px", height: "120px", margin: "0 auto 32px",
                            borderRadius: "50%", position: "relative",
                            background: "conic-gradient(from 0deg, #6366f1, #8b5cf6, #a855f7, #6366f1)",
                            animation: "spin 1.5s linear infinite"
                        }}>
                            <div style={{
                                position: "absolute", inset: "8px", borderRadius: "50%",
                                background: "#0f0f1a", display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <FileText size={40} style={{ color: "#6366f1" }} />
                            </div>
                        </div>
                        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
                            Analyzing Your Resume...
                        </h2>
                        <p style={{ color: "#9ca3af", maxWidth: "400px", margin: "0 auto 24px" }}>
                            Our AI is reviewing your resume across 5 professional dimensions
                        </p>
                        <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
                            {["Education", "Experience", "Skills", "Projects", "Presentation"].map((item, i) => (
                                <div key={item} style={{
                                    display: "flex", alignItems: "center", gap: "8px",
                                    color: "#6366f1", fontSize: "0.875rem",
                                    animation: `fadeIn 0.5s ease ${i * 0.2}s forwards`,
                                    opacity: 0
                                }}>
                                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                    <style>{`
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    `}</style>
                </div>
            </SidebarLayout>
        );
    }

    // Upload UI
    if (!analysis) {
        return (
            <SidebarLayout>
                <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", padding: "32px 24px" }}>
                    {/* Title */}
                    <div style={{ textAlign: "center", marginBottom: "32px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "8px" }}>
                            <FileText size={32} style={{ color: "#6366f1" }} />
                            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}>Resume Analyser</h1>
                        </div>
                        <p style={{ color: "#9ca3af" }}>Get AI-powered insights and professional scoring</p>
                    </div>

                    {/* Hidden file input */}
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileChange} style={{ display: "none" }} />

                    {/* Upload Area */}
                    <div
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        onClick={triggerFileInput}
                        style={{
                            background: dragActive ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.05)",
                            border: `2px dashed ${dragActive ? "#6366f1" : "rgba(255,255,255,0.2)"}`,
                            borderRadius: "20px", padding: "60px 40px", textAlign: "center", cursor: "pointer",
                            transition: "all 0.3s ease"
                        }}
                    >
                        <Upload size={48} style={{ color: "#6366f1", marginBottom: "16px" }} />
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "8px", color: "#fff" }}>Upload Your Resume</h2>
                        <p style={{ color: "#9ca3af", marginBottom: "16px" }}>Drag & drop your PDF or DOCX resume, or click to browse</p>
                        <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Supports PDF, DOCX, DOC, TXT files up to 10MB</p>

                        {file && (
                            <div style={{
                                marginTop: "24px", padding: "16px", background: "rgba(99, 102, 241, 0.2)",
                                borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "12px"
                            }}>
                                <FileText size={20} style={{ color: "#6366f1" }} />
                                <span style={{ color: "#fff" }}>{file.name}</span>
                                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                        )}

                        <div style={{ marginTop: "24px" }}>
                            {!file ? (
                                <button onClick={(e) => { e.stopPropagation(); triggerFileInput(e); }} style={{
                                    padding: "12px 32px", background: "#6366f1", color: "#fff",
                                    border: "none", borderRadius: "12px", cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "1rem"
                                }}>
                                    <Upload size={18} /> Choose File
                                </button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); handleAnalyze(); }} disabled={analyzing} style={{
                                    padding: "12px 32px", background: "linear-gradient(135deg, #22c55e, #10b981)",
                                    color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "1rem",
                                    opacity: analyzing ? 0.7 : 1
                                }}>
                                    {analyzing ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><Zap size={18} /> Start Analysis</>}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginTop: "16px", padding: "16px", background: "rgba(239, 68, 68, 0.2)",
                            border: "1px solid rgba(239, 68, 68, 0.5)", borderRadius: "12px",
                            color: "#fca5a5", display: "flex", alignItems: "center", gap: "12px"
                        }}>
                            <AlertCircle size={20} /> {error}
                        </div>
                    )}

                    {/* Features */}
                    <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                        {[
                            { icon: <BarChart3 size={24} />, label: "AI Analysis", color: "#6366f1" },
                            { icon: <Shield size={24} />, label: "ATS Check", color: "#22c55e" },
                            { icon: <DollarSign size={24} />, label: "Salary Insights", color: "#f59e0b" },
                            { icon: <MessageSquare size={24} />, label: "Interview Prep", color: "#ec4899" },
                        ].map((f, i) => (
                            <div key={i} style={{
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                                padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.1)"
                            }}>
                                <span style={{ color: f.color }}>{f.icon}</span>
                                <span style={{ fontSize: "0.875rem", color: "#d1d5db" }}>{f.label}</span>
                            </div>
                        ))}
                    </div>
                    {showUpgradeModal && <UpgradeModal />}
                </div>
            </SidebarLayout>
        );
    }

    // Results UI
    return (
        <SidebarLayout>
            <div ref={componentRef} style={{ minHeight: "100vh", background: "#f8fafc" }}>
                {/* Compact Header */}
                <header style={{
                    background: "#fff", borderBottom: "1px solid #e5e7eb",
                    padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <CheckCircle size={20} style={{ color: "#22c55e" }} />
                        <span style={{ fontWeight: 600, color: "#111" }}>Analysis Complete</span>
                    </div>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button onClick={() => { setAnalysis(null); handleAnalyze(); }} style={{
                            display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
                            background: "#f3f4f6", border: "none", borderRadius: "8px", cursor: "pointer", color: "#374151"
                        }}>
                            <RefreshCw size={16} /> Re-analyze
                        </button>
                        <button onClick={resetAnalysis} style={{
                            display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
                            background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer"
                        }}>
                            <Plus size={16} /> New Resume
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <nav style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "center", gap: "4px", padding: "0 24px" }}>
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            display: "flex", alignItems: "center", gap: "8px", padding: "16px 20px",
                            background: "transparent", border: "none",
                            borderBottom: activeTab === tab.id ? "3px solid #6366f1" : "3px solid transparent",
                            color: activeTab === tab.id ? "#6366f1" : "#6b7280",
                            cursor: "pointer", fontSize: "0.875rem", fontWeight: activeTab === tab.id ? 600 : 400
                        }}>
                            {tab.icon} {tab.label}
                            {tab.premium && userTier === "free" && <Lock size={14} style={{ color: "#f59e0b" }} />}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

                    {/* Tab 1: Overview */}
                    {activeTab === "overview" && (
                        <div>
                            {/* Score Card */}
                            <LazySection animation="scale" delay={0}>
                                <div style={{
                                    background: "linear-gradient(135deg, #fef2f2 0%, #fff 100%)",
                                    border: "1px solid #fecaca", borderRadius: "20px",
                                    padding: "40px", textAlign: "center", marginBottom: "32px"
                                }}>
                                    <div style={{
                                        width: "140px", height: "140px", borderRadius: "50%",
                                        background: `conic-gradient(${getGradeColor(analysis.grade)} ${analysis.overallScore * 3.6}deg, #e5e7eb 0deg)`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        margin: "0 auto 20px", position: "relative"
                                    }}>
                                        <div style={{
                                            width: "110px", height: "110px", borderRadius: "50%", background: "#fff",
                                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                                        }}>
                                            <span style={{ fontSize: "2.5rem", fontWeight: 700, color: getGradeColor(analysis.grade) }}>{analysis.overallScore}</span>
                                            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>/100</span>
                                        </div>
                                    </div>
                                    <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: getGradeColor(analysis.grade), marginBottom: "8px" }}>Grade: {analysis.grade}</h2>
                                    <p style={{ color: "#374151", fontSize: "0.875rem" }}>{analysis.gradeDescription}</p>
                                </div>
                            </LazySection>

                            {/* Breakdown */}
                            <LazySection animation="slide-up" delay={100}>
                                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "16px", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <BarChart3 size={20} style={{ color: "#6366f1" }} /> Professional Assessment Breakdown
                                </h3>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                                    {[
                                        { key: "education", label: "Education", icon: <GraduationCap size={20} />, color: "#ef4444" },
                                        { key: "experience", label: "Experience", icon: <Briefcase size={20} />, color: "#f97316" },
                                        { key: "technicalSkills", label: "Technical Skills", icon: <Code size={20} />, color: "#eab308" },
                                        { key: "projects", label: "Projects", icon: <Target size={20} />, color: "#22c55e" },
                                        { key: "presentation", label: "Presentation", icon: <Award size={20} />, color: "#6366f1" },
                                    ].map((item) => {
                                        const scoreData = analysis.scores[item.key as keyof typeof analysis.scores];
                                        return (
                                            <div key={item.key} style={{
                                                background: "#fff", borderRadius: "16px", padding: "20px",
                                                border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                                    <span style={{ color: item.color }}>{item.icon}</span>
                                                    <span style={{ fontWeight: 500, color: "#111" }}>{item.label}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Score</span>
                                                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: getScoreColor(scoreData.score) }}>{scoreData.score}%</span>
                                                </div>
                                                <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                                                    <div style={{ width: `${scoreData.score}%`, height: "100%", background: getScoreColor(scoreData.score), borderRadius: "4px" }} />
                                                </div>
                                                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "12px" }}>{scoreData.feedback}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </LazySection>

                            {/* Strengths & Tips */}
                            <LazySection animation="slide-up" delay={200}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "16px", padding: "24px" }}>
                                        <h4 style={{ fontWeight: 600, color: "#15803d", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <CheckCircle size={20} /> 💪 Key Strengths
                                        </h4>
                                        {analysis.strengths.map((s, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                                <Star size={16} style={{ color: "#f59e0b" }} />
                                                <span style={{ fontSize: "0.875rem", color: "#166534" }}>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "16px", padding: "24px" }}>
                                        <h4 style={{ fontWeight: 600, color: "#1d4ed8", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <TrendingUp size={20} /> 💡 Pro Tips
                                        </h4>
                                        {analysis.proTips.map((t, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                                                <ChevronRight size={16} style={{ color: "#3b82f6", marginTop: "2px" }} />
                                                <span style={{ fontSize: "0.875rem", color: "#1e40af" }}>{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </LazySection>
                        </div>
                    )}

                    {/* Tab 2: Profile Details */}
                    {activeTab === "profile" && (
                        <div>
                            {/* Resume Comparison Banner */}
                            <FeatureBanner feature="compare" userTier={userTier} />

                            {/* Profile Header */}
                            <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
                                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1d4ed8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <UserIcon size={24} /> {analysis.profile.name}
                                </h2>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                                    {analysis.profile.email !== "Not Found" && (
                                        <span style={{ background: "#6366f1", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem" }}>{analysis.profile.email}</span>
                                    )}
                                    {analysis.profile.phone !== "Not Found" && (
                                        <span style={{ background: "#22c55e", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem" }}>{analysis.profile.phone}</span>
                                    )}
                                </div>
                                <p style={{ color: "#374151", lineHeight: 1.6 }}>{analysis.profile.summary}</p>
                            </div>

                            {/* Education & Experience */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                                <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#f59e0b", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                        <GraduationCap size={20} /> Educational Background
                                    </h3>
                                    {analysis.education.length > 0 ? analysis.education.map((edu, i) => (
                                        <div key={i} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: i < analysis.education.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                                            <div style={{ fontWeight: 500, color: "#111" }}>{edu.degree}</div>
                                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{edu.institution}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{edu.year}</div>
                                        </div>
                                    )) : <p style={{ color: "#9ca3af" }}>No education data found</p>}
                                </div>
                                <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#8b5cf6", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Briefcase size={20} /> Professional Experience
                                    </h3>
                                    {analysis.experience.length > 0 ? analysis.experience.map((exp, i) => (
                                        <div key={i} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: i < analysis.experience.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                                            <div style={{ fontWeight: 500, color: "#111" }}>{exp.title}</div>
                                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{exp.company}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{exp.duration}</div>
                                        </div>
                                    )) : <p style={{ color: "#9ca3af" }}>No experience data found</p>}
                                </div>
                            </div>

                            {/* Skills */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Code size={20} style={{ color: "#6366f1" }} /> 🛠️ Technical Skills Analysis
                                </h3>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                                    {[
                                        { label: "TECHNICAL", skills: analysis.skills.technical, color: "#6366f1" },
                                        { label: "LANGUAGES", skills: analysis.skills.languages, color: "#22c55e" },
                                        { label: "SOFT", skills: analysis.skills.soft, color: "#f59e0b" },
                                        { label: "ML/AI", skills: analysis.skills.mlAi, color: "#ec4899" },
                                        { label: "TOOLS", skills: analysis.skills.tools, color: "#8b5cf6" },
                                    ].map((cat) => (
                                        <div key={cat.label} style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
                                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: cat.color, marginBottom: "8px" }}>{cat.label} ({cat.skills.length})</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                {cat.skills.length > 0 ? cat.skills.map((skill, i) => (
                                                    <span key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", color: "#374151" }}>{skill}</span>
                                                )) : <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>None</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Projects */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Target size={20} style={{ color: "#22c55e" }} /> 📁 Project Portfolio
                                </h3>
                                {analysis.projects.length > 0 ? (
                                    <div style={{ display: "grid", gap: "16px" }}>
                                        {analysis.projects.map((project, i) => (
                                            <div key={i} style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
                                                <div style={{ fontWeight: 500, marginBottom: "4px", color: "#111" }}>{project.name}</div>
                                                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>{project.description}</div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                    {project.technologies.map((tech, j) => (
                                                        <span key={j} style={{ background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem" }}>{tech}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p style={{ color: "#9ca3af" }}>No projects found</p>}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Insights & Tips */}
                    {activeTab === "insights" && (
                        <div>
                            {/* Company Compatibility Banner */}
                            <FeatureBanner feature="company" userTier={userTier} />

                            {/* Market Intelligence */}
                            <div style={{
                                background: "linear-gradient(135deg, #fef3c7 0%, #e0f2fe 50%, #f3e8ff 100%)",
                                borderRadius: "20px", padding: "32px", marginBottom: "32px"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                    <div>
                                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <BarChart3 size={24} /> Professional Market Intelligence
                                        </h3>
                                        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Market positioning and salary potential</p>
                                    </div>
                                    <span style={{
                                        background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff",
                                        padding: "6px 16px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600
                                    }}>
                                        💎 PREMIUM ANALYSIS
                                    </span>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                                    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
                                        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#22c55e", marginBottom: "4px" }}>{analysis.marketIntelligence.salaryRange}</div>
                                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Expected Salary Range</div>
                                        <div style={{ fontSize: "0.75rem", color: "#22c55e", marginTop: "4px" }}>✓ Market Competitive</div>
                                    </div>
                                    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
                                        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#6366f1", marginBottom: "4px" }}>{analysis.marketIntelligence.experienceLevel}</div>
                                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Experience Level</div>
                                        <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: "4px" }}>⚡ Industry Standard</div>
                                    </div>
                                    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
                                        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6", marginBottom: "4px" }}>{analysis.marketIntelligence.atsCompatibility}%</div>
                                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>ATS Compatibility</div>
                                        <div style={{ fontSize: "0.75rem", color: "#22c55e", marginTop: "4px" }}>🔧 System Ready</div>
                                    </div>
                                </div>
                            </div>

                            {/* Role Compatibility */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#111" }}>🎯 Role Compatibility Analysis</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                                    {Object.entries(analysis.roleCompatibility).map(([role, score]) => (
                                        <div key={role} style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                                <span style={{ fontSize: "0.875rem", textTransform: "capitalize", color: "#374151" }}>{role}</span>
                                                <span style={{ fontWeight: 600, color: getScoreColor(score) }}>{score}%</span>
                                            </div>
                                            <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "3px" }}>
                                                <div style={{ width: `${score}%`, height: "100%", background: getScoreColor(score), borderRadius: "3px" }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Weaknesses */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#dc2626" }}>⚠️ Areas for Improvement</h3>
                                {analysis.weaknesses.map((w, i) => (
                                    <div key={i} style={{
                                        display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px",
                                        background: "#fef2f2", padding: "12px 16px", borderRadius: "8px"
                                    }}>
                                        <AlertCircle size={16} style={{ color: "#ef4444" }} />
                                        <span style={{ fontSize: "0.875rem", color: "#991b1b" }}>{w}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Interview Prep */}
                    {activeTab === "interview" && (
                        <div>
                            <div style={{ marginBottom: "32px" }}>
                                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "8px", color: "#111" }}>🎤 Interview Preparation</h2>
                                <p style={{ color: "#6b7280" }}>AI-generated questions and tips based on your resume</p>
                            </div>

                            {/* Interview Prep Feature Banner */}
                            <FeatureBanner feature="interview" userTier={userTier} />

                            {/* Recruiter Questions */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#6366f1" }}>👤 Questions Recruiters Might Ask</h3>
                                {analysis.interviewPrep.recruiterQuestions.map((q, i) => (
                                    <div key={i} style={{ background: "#f0f9ff", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #6366f1", marginBottom: "12px" }}>
                                        <span style={{ fontSize: "0.875rem", color: "#1e40af" }}>{q}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Technical Questions */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#22c55e" }}>💻 Technical Questions</h3>
                                {analysis.interviewPrep.technicalQuestions.map((q, i) => (
                                    <div key={i} style={{ background: "#f0fdf4", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #22c55e", marginBottom: "12px" }}>
                                        <span style={{ fontSize: "0.875rem", color: "#166534" }}>{q}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Behavioral Questions */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#f59e0b" }}>🧠 Behavioral Questions</h3>
                                {analysis.interviewPrep.behavioralQuestions.map((q, i) => (
                                    <div key={i} style={{ background: "#fffbeb", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #f59e0b", marginBottom: "12px" }}>
                                        <span style={{ fontSize: "0.875rem", color: "#92400e" }}>{q}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Tips */}
                            <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)", borderRadius: "16px", padding: "24px" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px", color: "#1d4ed8" }}>💡 Interview Tips</h3>
                                {analysis.interviewPrep.tips.map((tip, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                                        <Zap size={16} style={{ color: "#f59e0b", marginTop: "2px" }} />
                                        <span style={{ fontSize: "0.875rem", color: "#1e40af" }}>{tip}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Export - Full Report Preview */}
                    {activeTab === "export" && (
                        <div>
                            {/* ATS Resume Suite - Direct access for Premium users */}
                            {userTier === "premium" ? (
                                <div style={{ marginBottom: "32px" }}>
                                    <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#111" }}>
                                        <Sparkles size={20} style={{ color: "#6366f1" }} />
                                        Generate ATS-Friendly Resume
                                    </h3>
                                    <ExportOptions
                                        generatedResume={analysis ? {
                                            profile: {
                                                name: analysis.profile.name,
                                                email: analysis.profile.email,
                                                phone: analysis.profile.phone,
                                                location: analysis.profile.location
                                            },
                                            summary: analysis.profile.summary,
                                            experience: analysis.experience.map(exp => ({
                                                company: exp.company,
                                                role: exp.title,
                                                duration: exp.duration,
                                                bullets: exp.highlights || [exp.description]
                                            })),
                                            education: analysis.education.map(edu => ({
                                                institution: edu.institution,
                                                degree: edu.degree,
                                                year: edu.year
                                            })),
                                            skills: [...analysis.skills.technical, ...analysis.skills.tools, ...analysis.skills.languages],
                                            projects: analysis.projects.map(proj => ({
                                                name: proj.name,
                                                description: proj.description,
                                                technologies: proj.technologies
                                            }))
                                        } : null}
                                        userId={user?.uid || ""}
                                        userPlan={userTier}
                                        exportsUsed={exportsUsed}
                                        exportLimit={10}
                                        onExportComplete={() => setExportsUsed(prev => prev + 1)}
                                    />
                                </div>
                            ) : (
                                /* Non-premium users see upgrade prompt */
                                <div style={{ marginBottom: "32px" }}>
                                    <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#111" }}>
                                        <Sparkles size={20} style={{ color: "#6366f1" }} />
                                        Generate ATS-Friendly Resume
                                    </h3>
                                    <div style={{
                                        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1))",
                                        borderRadius: "16px",
                                        padding: "32px",
                                        textAlign: "center",
                                        border: "1px solid rgba(139, 92, 246, 0.2)"
                                    }}>
                                        <div style={{
                                            width: "64px", height: "64px", borderRadius: "16px",
                                            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            margin: "0 auto 16px"
                                        }}>
                                            <Lock size={28} color="#fff" />
                                        </div>
                                        <h4 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px", color: "#111" }}>
                                            Premium Feature
                                        </h4>
                                        <p style={{ color: "#666", marginBottom: "20px", fontSize: "0.95rem" }}>
                                            Generate ATS-optimized resumes tailored to specific roles with our AI-powered resume suite.
                                        </p>
                                        <a href="/pricing" style={{
                                            display: "inline-flex", alignItems: "center", gap: "8px",
                                            padding: "12px 24px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                                            borderRadius: "12px", color: "#fff", textDecoration: "none",
                                            fontWeight: 600, fontSize: "0.95rem"
                                        }}>
                                            <Crown size={18} />
                                            Upgrade to Premium
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            <div style={{ height: "1px", background: "var(--border-color)", margin: "32px 0" }} />

                            {/* Original Report Download Buttons */}
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#111" }}>
                                <FileDown size={20} style={{ color: "#6366f1" }} />
                                Download Analysis Report
                            </h3>
                            <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginBottom: "32px" }}>
                                <button onClick={() => handlePrint()} style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    padding: "16px 32px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    color: "#fff", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: 600, cursor: "pointer"
                                }}>
                                    <FileDown size={20} /> Download PDF
                                </button>
                                <button onClick={() => {
                                    const content = `RESUME ANALYSIS REPORT
========================================

CANDIDATE: ${analysis.profile.name}
EMAIL: ${analysis.profile.email}
PHONE: ${analysis.profile.phone}

----------------------------------------
OVERALL SCORE: ${analysis.overallScore}/100 (Grade: ${analysis.grade})
----------------------------------------

${analysis.gradeDescription}

========================================
SECTION SCORES
========================================
• Education: ${analysis.scores.education.score}%
  ${analysis.scores.education.feedback}

• Experience: ${analysis.scores.experience.score}%
  ${analysis.scores.experience.feedback}

• Technical Skills: ${analysis.scores.technicalSkills.score}%
  ${analysis.scores.technicalSkills.feedback}

• Projects: ${analysis.scores.projects.score}%
  ${analysis.scores.projects.feedback}

• Presentation: ${analysis.scores.presentation.score}%
  ${analysis.scores.presentation.feedback}

========================================
SKILLS ANALYSIS
========================================
Technical: ${analysis.skills.technical.join(', ') || 'None identified'}
Languages: ${analysis.skills.languages.join(', ') || 'None identified'}
Tools: ${analysis.skills.tools.join(', ') || 'None identified'}
Soft Skills: ${analysis.skills.soft.join(', ') || 'None identified'}
ML/AI: ${analysis.skills.mlAi.join(', ') || 'None identified'}

========================================
MARKET INTELLIGENCE
========================================
Salary Range: ${analysis.marketIntelligence.salaryRange}
Experience Level: ${analysis.marketIntelligence.experienceLevel}
ATS Compatibility: ${analysis.marketIntelligence.atsCompatibility}%
Market Demand: ${analysis.marketIntelligence.marketDemand}

========================================
KEY STRENGTHS
========================================
${analysis.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

========================================
AREAS FOR IMPROVEMENT
========================================
${analysis.weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

========================================
PRO TIPS
========================================
${analysis.proTips.map((t, i) => `${i + 1}. ${t}`).join('\n')}

========================================
INTERVIEW PREPARATION
========================================

RECRUITER QUESTIONS:
${analysis.interviewPrep.recruiterQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

TECHNICAL QUESTIONS:
${analysis.interviewPrep.technicalQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

BEHAVIORAL QUESTIONS:
${analysis.interviewPrep.behavioralQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

========================================
Report generated by AI Resume Analyser
========================================`;
                                    const blob = new Blob([content], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Resume_Analysis_${analysis.profile.name}.txt`;
                                    a.click();
                                }} style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    padding: "16px 32px", background: "#fff", border: "2px solid #6366f1",
                                    color: "#6366f1", borderRadius: "12px", fontSize: "1rem", fontWeight: 600, cursor: "pointer"
                                }}>
                                    <Globe size={20} /> Download Text
                                </button>
                            </div>

                            {/* Report Preview */}
                            <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", border: "1px solid #e5e7eb", maxWidth: "800px", margin: "0 auto" }}>
                                {/* Header */}
                                <div style={{ textAlign: "center", borderBottom: "2px solid #6366f1", paddingBottom: "24px", marginBottom: "24px" }}>
                                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111", marginBottom: "8px" }}>Resume Analysis Report</h1>
                                    <p style={{ color: "#6b7280" }}>AI-Powered Professional Assessment</p>
                                </div>

                                {/* Candidate Info */}
                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1d4ed8", marginBottom: "12px" }}>{analysis.profile.name}</h2>
                                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                                        <span style={{ color: "#374151" }}>📧 {analysis.profile.email}</span>
                                        <span style={{ color: "#374151" }}>📱 {analysis.profile.phone}</span>
                                    </div>
                                    <p style={{ color: "#6b7280", marginTop: "12px", lineHeight: 1.6 }}>{analysis.profile.summary}</p>
                                </div>

                                {/* Score Summary */}
                                <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px", background: "#fef2f2", borderRadius: "12px", padding: "20px" }}>
                                    <div style={{
                                        width: "80px", height: "80px", borderRadius: "50%",
                                        background: `conic-gradient(${getGradeColor(analysis.grade)} ${analysis.overallScore * 3.6}deg, #e5e7eb 0deg)`,
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}>
                                        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: getGradeColor(analysis.grade) }}>{analysis.overallScore}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: getGradeColor(analysis.grade) }}>Grade: {analysis.grade}</h3>
                                        <p style={{ color: "#374151" }}>{analysis.gradeDescription}</p>
                                    </div>
                                </div>

                                {/* Section Scores */}
                                <div style={{ marginBottom: "24px" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "12px", color: "#111" }}>Section Breakdown</h3>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ background: "#f3f4f6" }}>
                                                <th style={{ padding: "12px", textAlign: "left", color: "#374151" }}>Section</th>
                                                <th style={{ padding: "12px", textAlign: "center", color: "#374151" }}>Score</th>
                                                <th style={{ padding: "12px", textAlign: "left", color: "#374151" }}>Feedback</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { name: "Education", data: analysis.scores.education },
                                                { name: "Experience", data: analysis.scores.experience },
                                                { name: "Technical Skills", data: analysis.scores.technicalSkills },
                                                { name: "Projects", data: analysis.scores.projects },
                                                { name: "Presentation", data: analysis.scores.presentation },
                                            ].map((section, i) => (
                                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                                    <td style={{ padding: "12px", color: "#111" }}>{section.name}</td>
                                                    <td style={{ padding: "12px", textAlign: "center", fontWeight: 600, color: getScoreColor(section.data.score) }}>{section.data.score}%</td>
                                                    <td style={{ padding: "12px", color: "#6b7280", fontSize: "0.875rem" }}>{section.data.feedback}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Skills */}
                                <div style={{ marginBottom: "24px" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "12px", color: "#111" }}>Skills Analysis</h3>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                        <div><strong style={{ color: "#6366f1" }}>Technical:</strong> <span style={{ color: "#374151" }}>{analysis.skills.technical.join(', ') || 'None'}</span></div>
                                        <div><strong style={{ color: "#22c55e" }}>Languages:</strong> <span style={{ color: "#374151" }}>{analysis.skills.languages.join(', ') || 'None'}</span></div>
                                        <div><strong style={{ color: "#f59e0b" }}>Tools:</strong> <span style={{ color: "#374151" }}>{analysis.skills.tools.join(', ') || 'None'}</span></div>
                                        <div><strong style={{ color: "#ec4899" }}>Soft Skills:</strong> <span style={{ color: "#374151" }}>{analysis.skills.soft.join(', ') || 'None'}</span></div>
                                    </div>
                                </div>

                                {/* Strengths & Weaknesses */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                                    <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px" }}>
                                        <h4 style={{ fontWeight: 600, color: "#15803d", marginBottom: "8px" }}>✅ Strengths</h4>
                                        <ul style={{ margin: 0, paddingLeft: "20px" }}>
                                            {analysis.strengths.map((s, i) => <li key={i} style={{ color: "#166534", marginBottom: "4px" }}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div style={{ background: "#fef2f2", borderRadius: "12px", padding: "16px" }}>
                                        <h4 style={{ fontWeight: 600, color: "#dc2626", marginBottom: "8px" }}>⚠️ Areas to Improve</h4>
                                        <ul style={{ margin: 0, paddingLeft: "20px" }}>
                                            {analysis.weaknesses.map((w, i) => <li key={i} style={{ color: "#991b1b", marginBottom: "4px" }}>{w}</li>)}
                                        </ul>
                                    </div>
                                </div>

                                {/* Market Intel */}
                                <div style={{ background: "#eff6ff", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
                                    <h4 style={{ fontWeight: 600, color: "#1d4ed8", marginBottom: "12px" }}>📊 Market Intelligence</h4>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", textAlign: "center" }}>
                                        <div><div style={{ fontWeight: 600, color: "#22c55e" }}>{analysis.marketIntelligence.salaryRange}</div><div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Salary Range</div></div>
                                        <div><div style={{ fontWeight: 600, color: "#6366f1" }}>{analysis.marketIntelligence.experienceLevel}</div><div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Level</div></div>
                                        <div><div style={{ fontWeight: 600, color: "#8b5cf6" }}>{analysis.marketIntelligence.atsCompatibility}%</div><div style={{ fontSize: "0.75rem", color: "#6b7280" }}>ATS Score</div></div>
                                        <div><div style={{ fontWeight: 600, color: "#f59e0b" }}>{analysis.marketIntelligence.marketDemand}</div><div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Demand</div></div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div style={{ textAlign: "center", borderTop: "1px solid #e5e7eb", paddingTop: "16px", color: "#9ca3af", fontSize: "0.875rem" }}>
                                    Generated by AI Resume Analyser • {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
                {showUpgradeModal && <UpgradeModal />}
            </div>
        </SidebarLayout>
    );
}

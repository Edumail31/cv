"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    FileText, Sparkles, Crown, Clock,
    Upload, BarChart3, Shield, Target, Lock, MessageSquare, Building2, ArrowRight, RefreshCw
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, onSnapshot, deleteDoc } from "firebase/firestore";
import SidebarLayout from "@/components/SidebarLayout";
import LazySection from "@/components/LazySection";
import { PlanType, PLAN_LIMITS, getDaysUntilReset, shouldResetUsage } from "@/lib/usage";
import { Mail, RefreshCw as RefreshIcon } from "lucide-react"; // Renamed to avoid partial conflict if needed

// ... interfaces ...

interface UserData {
    tier: PlanType;
    usage: {
        resumeAnalyzer: number;
        resumeComparison: number;
        interviewQuestions: number;
        companyCompatibility: number;
        resumeExports: number;
        lastResetDate: Date;
    };
}

interface AnalysisHistory {
    id: string;
    fileName: string;
    score: number;
    grade: string;
    createdAt: Date;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [verificationResent, setVerificationResent] = useState(false);
    const [userData, setUserData] = useState<UserData>({
        tier: "free",
        usage: {
            resumeAnalyzer: 0,
            resumeComparison: 0,
            interviewQuestions: 0,
            companyCompatibility: 0,
            resumeExports: 0,
            lastResetDate: new Date(),
        },
    });
    // ... history state ...
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
    const [daysUntilReset, setDaysUntilReset] = useState(30);

    useEffect(() => {
        let userUnsubscribe: (() => void) | null = null;

        const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setAuthChecked(true);
            if (!currentUser) {
                router.push("/login");
                return;
            }

            // Check email verification
            if (!currentUser.emailVerified) {
                setUser(currentUser); // Still set user so we can access email/send verification
                setNeedsVerification(true);
                setLoading(false);
                return;
            }

            setUser(currentUser);
            // ... rest of data loading ...
            userUnsubscribe = onSnapshot(doc(db, "users", currentUser.uid), async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const usageData = data.featureUsage || data.usage || {};
                    const lastReset = usageData.lastResetDate?.toDate?.() ||
                        data.usage?.lastResetDate?.toDate?.() ||
                        data.lastResetDate?.toDate?.() ||
                        new Date();
                    const tier = data.tier || data.subscription?.plan || "free";

                    // Check if usage needs to be reset (30 days passed)
                    if (shouldResetUsage(lastReset, tier)) {
                        try {
                            await updateDoc(doc(db, "users", currentUser.uid), {
                                "usage.resumeAnalyzer": 0,
                                "usage.resumeComparison": 0,
                                "usage.interviewQuestions": 0,
                                "usage.companyCompatibility": 0,
                                "usage.resumeExports": 0,
                                "usage.lastResetDate": new Date()
                            });
                            // Don't update state here, the snapshot will fire again with new data
                            return;
                        } catch (error) {
                            console.error("Error resetting usage:", error);
                        }
                    }

                    setUserData({
                        tier,
                        usage: {
                            resumeAnalyzer: usageData.resumeAnalyzer || data.monthlyAnalyses || 0,
                            resumeComparison: usageData.resumeComparison || 0,
                            interviewQuestions: usageData.interviewQuestions || 0,
                            companyCompatibility: usageData.companyCompatibility || 0,
                            resumeExports: usageData.resumeExports || 0,
                            lastResetDate: lastReset,
                        },
                    });
                    setDaysUntilReset(getDaysUntilReset(lastReset, tier));
                }
                setLoading(false);
            }, (error) => {
                console.error("Error listening to user data:", error);
                setLoading(false);
            });

            await loadAnalysisHistory(currentUser.uid);
        });

        return () => {
            authUnsubscribe();
            if (userUnsubscribe) userUnsubscribe();
        };
    }, [router]);

    const loadUserData = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const data = userDoc.data();

                // Check all possible field locations for usage data
                const usageData = data.featureUsage || data.usage || {};
                const lastReset = usageData.lastResetDate?.toDate?.() ||
                    data.usage?.lastResetDate?.toDate?.() ||
                    data.lastResetDate?.toDate?.() ||
                    new Date();
                const tier = data.tier || data.subscription?.plan || "free";

                setUserData({
                    tier,
                    usage: {
                        resumeAnalyzer: usageData.resumeAnalyzer || data.monthlyAnalyses || 0,
                        resumeComparison: usageData.resumeComparison || 0,
                        interviewQuestions: usageData.interviewQuestions || 0,
                        companyCompatibility: usageData.companyCompatibility || 0,
                        resumeExports: usageData.resumeExports || 0,
                        lastResetDate: lastReset,
                    },
                });
                setDaysUntilReset(getDaysUntilReset(lastReset, tier));
            } else {
                // Create new user doc with proper structure
                await setDoc(doc(db, "users", uid), {
                    uid: uid,
                    email: auth.currentUser?.email || "",
                    displayName: auth.currentUser?.displayName || "User",
                    tier: "free",
                    usage: {
                        resumeAnalyzer: 0,
                        resumeComparison: 0,
                        interviewQuestions: 0,
                        companyCompatibility: 0,
                        resumeExports: 0,
                        lastResetDate: serverTimestamp(),
                    },
                    featureUsage: {
                        resumeAnalyzer: 0,
                        resumeComparison: 0,
                        interviewQuestions: 0,
                        companyCompatibility: 0,
                        resumeExports: 0,
                        lastResetDate: serverTimestamp(),
                    },
                    createdAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    };

    const loadAnalysisHistory = async (uid: string) => {
        try {
            const analysesRef = collection(db, "analyses");
            const q = query(analysesRef, where("userId", "==", uid));
            const snapshot = await getDocs(q);
            const history: AnalysisHistory[] = [];
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const createdAt = data.createdAt?.toDate() || new Date();

                // Auto-delete analyses older than 15 days
                if (createdAt < fifteenDaysAgo) {
                    try {
                        await deleteDoc(doc(db, "analyses", docSnap.id));
                        console.log(`Deleted expired analysis: ${docSnap.id}`);
                    } catch (deleteErr) {
                        console.error("Error deleting expired analysis:", deleteErr);
                    }
                    continue; // Skip adding to history
                }

                history.push({
                    id: docSnap.id,
                    fileName: data.fileName || "Untitled Analysis",
                    score: data.score || 0,
                    grade: data.grade || "N/A",
                    createdAt: createdAt,
                });
            }

            setAnalysisHistory(history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        } catch (error) {
            console.error("Error loading analysis history:", error);
        }
    };

    const getLimit = (feature: keyof typeof PLAN_LIMITS.free) => {
        const limit = PLAN_LIMITS[userData.tier][feature];
        return limit === -1 ? "∞" : limit;
    };

    const getUsageColor = (used: number, limit: number) => {
        if (limit === 0) return "#6b7280";
        if (limit === -1) return "#22c55e";
        const percentage = (used / limit) * 100;
        if (percentage >= 90) return "#ef4444";
        if (percentage >= 70) return "#f59e0b";
        return "#22c55e";
    };

    // Maximum analyses free users can view
    const maxFreeAnalysesView = 1;
    const canViewAnalysis = (index: number) => {
        if (userData.tier !== "free") return true;
        return index < maxFreeAnalysesView;
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
                <div className="animate-pulse" style={{ fontSize: "1.5rem" }}>Loading...</div>
            </div>
        );
    }

    const avgScore = analysisHistory.length > 0
        ? Math.round(analysisHistory.reduce((sum, a) => sum + a.score, 0) / analysisHistory.length)
        : 0;

    if (needsVerification) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-6)',
                background: '#0f0f1a',
                color: 'white'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '40px',
                    borderRadius: '24px',
                    maxWidth: '400px',
                    textAlign: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <Mail size={48} color="#22c55e" style={{ marginBottom: '20px' }} />
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Verify your Email</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                        Please verify your email address <strong>{user?.email}</strong> to access the dashboard.
                        <br /><br />
                        Check your inbox (and spam folder) for the verification link.
                    </p>
                    <button
                        onClick={async () => {
                            if (user) {
                                try {
                                    await sendEmailVerification(user, {
                                        url: window.location.origin + "/dashboard"
                                    });
                                    setVerificationResent(true);
                                } catch (e) {
                                    console.error(e);
                                }
                            }
                        }}
                        disabled={verificationResent}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            background: verificationResent ? '#4b5563' : '#6366f1',
                            color: 'white',
                            border: 'none',
                            fontWeight: '600',
                            cursor: verificationResent ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {verificationResent ? "Email Sent!" : "Resend Verification Email"}
                        {!verificationResent && <RefreshIcon size={16} />}
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '16px',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        I've verified, let me in!
                    </button>

                    <button
                        onClick={() => router.push('/login')}
                        style={{
                            display: 'block',
                            margin: '24px auto 0',
                            fontSize: '0.9rem',
                            color: '#6366f1',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Switch Account / Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <SidebarLayout>
            <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: "var(--space-8)" }}>
                {/* Welcome Card */}
                <div style={{
                    background: "linear-gradient(135deg, var(--primary-600) 0%, var(--primary-500) 100%)",
                    borderRadius: "var(--radius-xl)",
                    padding: "var(--space-8)",
                    marginBottom: "var(--space-8)",
                    color: "white"
                }}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "var(--space-2)" }}>
                        Welcome back, {user?.displayName?.split(" ")[0] || "User"}! 👋
                    </h1>
                    <p style={{ opacity: 0.9 }}>
                        Get AI-powered insights to improve your resume and land your dream job.
                    </p>
                </div>

                {/* Stats Row - Updated */}
                <LazySection animation="slide-up" delay={100}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
                        <div className="glass-purple" style={{
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-6)"
                        }}>
                            <div style={{ color: "#6366f1", marginBottom: "var(--space-3)" }}><BarChart3 size={24} /></div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{analysisHistory.length}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Total Analyses</div>
                        </div>
                        <div className="glass-green" style={{
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-6)"
                        }}>
                            <div style={{ color: "#22c55e", marginBottom: "var(--space-3)" }}><Target size={24} /></div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{avgScore || "--"}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Avg Score</div>
                        </div>
                        <div className="glass-orange" style={{
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-6)"
                        }}>
                            <div style={{ color: "#f59e0b", marginBottom: "var(--space-3)" }}><RefreshCw size={24} /></div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{daysUntilReset}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Days Until Reset</div>
                        </div>
                    </div>
                </LazySection>

                {/* Feature Usage Tracking */}
                <LazySection animation="slide-up" delay={200}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <BarChart3 size={20} />
                        Feature Usage
                    </h2>
                    <div style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        borderRadius: "var(--radius-lg)",
                        padding: "var(--space-6)",
                        marginBottom: "var(--space-8)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
                    }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                            {[
                                { name: "ATS Resume Score", key: "resumeAnalyzer" as const, used: userData.usage.resumeAnalyzer, icon: <FileText size={18} />, link: "/analyse" },
                                { name: "Compare Scores", key: "resumeComparison" as const, used: userData.usage.resumeComparison, icon: <BarChart3 size={18} />, link: "/compare", requiresPro: true },
                                { name: "Interview Questions", key: "interviewQuestions" as const, used: userData.usage.interviewQuestions, icon: <MessageSquare size={18} />, link: "/interview", requiresPro: true },
                                { name: "Job Fit Score", key: "companyCompatibility" as const, used: userData.usage.companyCompatibility, icon: <Building2 size={18} />, link: "/company", requiresPro: true },
                                { name: "Resume Exports", key: "resumeExports" as const, used: userData.usage.resumeExports, icon: <Sparkles size={18} />, link: "/analyse" },
                            ].map((feature) => {
                                const limit = PLAN_LIMITS[userData.tier][feature.key];
                                const isLocked = limit === 0;
                                const isUnlimited = limit === -1;
                                const percentage = isUnlimited ? 30 : isLocked ? 0 : Math.min(100, (feature.used / limit) * 100);

                                return (
                                    <div key={feature.key} style={{
                                        padding: "16px",
                                        background: "var(--bg-tertiary)",
                                        borderRadius: "12px",
                                        opacity: isLocked ? 0.7 : 1,
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                {isLocked ? <Lock size={18} color="#6b7280" /> : feature.icon}
                                                <span style={{ fontWeight: 500 }}>{feature.name}</span>
                                            </div>
                                            <span style={{
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                                color: getUsageColor(feature.used, limit)
                                            }}>
                                                {isLocked ? "PRO" : isUnlimited ? `${feature.used} / ∞` : `${feature.used} / ${limit}`}
                                            </span>
                                        </div>
                                        <div style={{
                                            height: "6px",
                                            background: "rgba(255,255,255,0.1)",
                                            borderRadius: "3px",
                                            overflow: "hidden"
                                        }}>
                                            <div style={{
                                                width: `${percentage}%`,
                                                height: "100%",
                                                background: isLocked ? "#6b7280" : getUsageColor(feature.used, limit),
                                                borderRadius: "3px",
                                                transition: "width 0.3s ease"
                                            }} />
                                        </div>
                                        {isLocked && (
                                            <Link href="/pricing" style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                fontSize: "0.75rem",
                                                color: "#f59e0b",
                                                marginTop: "8px",
                                                textDecoration: "none"
                                            }}>
                                                <Crown size={12} /> Upgrade to unlock
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </LazySection>

                {/* Features promo cards */}
                <LazySection animation="slide-up" delay={300}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "var(--space-4)" }}>
                        Explore Features
                    </h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
                        {/* Interview Prep Card */}
                        <Link href="/interview" style={{ textDecoration: "none" }}>
                            <div style={{
                                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))",
                                borderRadius: "var(--radius-lg)",
                                padding: "var(--space-6)",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                height: "100%"
                            }}>
                                <MessageSquare size={32} color="#f59e0b" style={{ marginBottom: "12px" }} />
                                <h3 style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>Interview Prep AI</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                                    Get 50+ AI-generated questions tailored to YOUR resume experience
                                </p>
                                <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 16px",
                                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                    borderRadius: "100px",
                                    color: "#fff",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    animation: "pulse 2s infinite"
                                }}>
                                    Try Interview Prep <ArrowRight size={14} />
                                </div>
                            </div>
                        </Link>

                        {/* Company Compatibility Card */}
                        <Link href="/company" style={{ textDecoration: "none" }}>
                            <div style={{
                                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1))",
                                borderRadius: "var(--radius-lg)",
                                padding: "var(--space-6)",
                                border: "1px solid rgba(139, 92, 246, 0.3)",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                height: "100%"
                            }}>
                                <Building2 size={32} color="#8b5cf6" style={{ marginBottom: "12px" }} />
                                <h3 style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>Company Fit Analysis</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                                    See how well you match with Google, Microsoft, Amazon & more
                                </p>
                                <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 16px",
                                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                                    borderRadius: "100px",
                                    color: "#fff",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    animation: "pulse 2s infinite"
                                }}>
                                    Check Company Fit <ArrowRight size={14} />
                                </div>
                            </div>
                        </Link>

                        {/* Resume Comparison Card */}
                        <Link href="/compare" style={{ textDecoration: "none" }}>
                            <div style={{
                                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))",
                                borderRadius: "var(--radius-lg)",
                                padding: "var(--space-6)",
                                border: "1px solid rgba(34, 197, 94, 0.3)",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                height: "100%"
                            }}>
                                <BarChart3 size={32} color="#22c55e" style={{ marginBottom: "12px" }} />
                                <h3 style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>Resume Comparison</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                                    Compare two resumes head-to-head across 20+ parameters
                                </p>
                                <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 16px",
                                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                    borderRadius: "100px",
                                    color: "#fff",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    animation: "pulse 2s infinite"
                                }}>
                                    Compare Resumes <ArrowRight size={14} />
                                </div>
                            </div>
                        </Link>
                    </div>
                </LazySection>

                {/* Recent Analyses */}
                <LazySection animation="fade" delay={400}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "var(--space-2)" }}>
                        Recent Analyses
                    </h2>
                    {/* 15-day retention warning */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        background: "rgba(245, 158, 11, 0.1)",
                        borderRadius: "8px",
                        marginBottom: "var(--space-4)",
                        fontSize: "0.8rem",
                        color: "#f59e0b"
                    }}>
                        <Clock size={14} />
                        Analyses are stored for 15 days
                    </div>
                    {analysisHistory.length > 0 ? (
                        <div style={{ display: "grid", gap: "var(--space-3)" }}>
                            {analysisHistory.slice(0, 5).map((analysis, index) => {
                                const canView = canViewAnalysis(index);
                                const cardStyle = {
                                    background: "var(--bg-secondary)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "var(--space-4)",
                                    border: "1px solid var(--border-color)",
                                    display: "flex",
                                    alignItems: "center" as const,
                                    justifyContent: "space-between" as const,
                                    opacity: canView ? 1 : 0.6,
                                    cursor: canView ? "pointer" : "default",
                                    textDecoration: "none" as const,
                                    color: "inherit",
                                    transition: "border-color 0.2s"
                                };

                                const cardContent = (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                            <FileText size={24} style={{ color: "var(--text-tertiary)" }} />
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{analysis.fileName}</div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                                    {analysis.createdAt.toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        {canView ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <div style={{
                                                    padding: "var(--space-2) var(--space-4)",
                                                    background: analysis.score >= 70 ? "#22c55e20" : analysis.score >= 40 ? "#f59e0b20" : "#ef444420",
                                                    borderRadius: "var(--radius-full)",
                                                    fontWeight: 600,
                                                    color: analysis.score >= 70 ? "#22c55e" : analysis.score >= 40 ? "#f59e0b" : "#ef4444"
                                                }}>
                                                    {analysis.score}/100 ({analysis.grade})
                                                </div>
                                                <ArrowRight size={16} style={{ color: "var(--text-tertiary)" }} />
                                            </div>
                                        ) : (
                                            <Link href="/pricing" style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "8px 16px",
                                                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                                borderRadius: "100px",
                                                color: "#fff",
                                                fontSize: "0.8rem",
                                                fontWeight: 600,
                                                textDecoration: "none"
                                            }}>
                                                <Lock size={14} /> Upgrade to View
                                            </Link>
                                        )}
                                    </>
                                );

                                return canView ? (
                                    <Link key={analysis.id} href={`/analyse?view=${analysis.id}`} style={cardStyle}>
                                        {cardContent}
                                    </Link>
                                ) : (
                                    <div key={analysis.id} style={cardStyle}>
                                        {cardContent}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{
                            background: "var(--bg-secondary)",
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-12)",
                            textAlign: "center",
                            border: "1px solid var(--border-color)"
                        }}>
                            <FileText size={48} style={{ color: "var(--text-tertiary)", margin: "0 auto 16px" }} />
                            <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>No analyses yet</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                                Upload your resume to get started with AI-powered analysis
                            </p>
                            <Link href="/analyse" style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 24px",
                                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                                borderRadius: "12px",
                                color: "#fff",
                                fontWeight: 600,
                                textDecoration: "none"
                            }}>
                                <Upload size={18} />
                                Analyse Your First Resume
                            </Link>
                        </div>
                    )}
                </LazySection>
            </div>

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.02); opacity: 0.9; }
                }
            `}</style>
        </SidebarLayout>
    );
}

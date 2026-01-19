"use client";

import { useState } from "react";
import { FileText, Sparkles, X, Loader2, Download, ChevronDown, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ResumeData {
    profile: {
        name: string;
        email: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        github?: string;
    };
    summary?: string;
    experience: Array<{
        company: string;
        role: string;
        duration: string;
        bullets: string[];
    }>;
    education: Array<{
        institution: string;
        degree: string;
        year: string;
    }>;
    skills: string[];
    projects: Array<{
        name: string;
        description: string;
        technologies?: string[];
    }>;
}

interface GeneratedResume extends ResumeData {
    blueprint: {
        role: string;
        sections: string[];
        font: string;
        spacing: string;
    };
    targetRole: string;
    targetProfile: string;
}

interface ResumeGeneratorProps {
    resumeData: ResumeData | null;
    detectedRole?: string;
    userId: string;
    userPlan: "free" | "pro" | "premium";
    exportsUsed: number;
    exportLimit: number;
    onGenerated: (resume: GeneratedResume) => void;
}

const TARGET_PROFILES = [
    { id: "fresher", label: "Fresher / Entry Level", description: "Just starting your career" },
    { id: "software_engineer", label: "Software Engineer", description: "Technical roles" },
    { id: "product_manager", label: "Product Manager", description: "PM & leadership roles" },
    { id: "job_change", label: "Job Change", description: "Same role, new company" },
];

type GenerationStep = "idle" | "normalizing" | "rewriting" | "optimizing" | "complete" | "error";

export default function ResumeGenerator({
    resumeData,
    detectedRole = "Software Engineer",
    userId,
    userPlan,
    exportsUsed,
    exportLimit,
    onGenerated
}: ResumeGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [generationStep, setGenerationStep] = useState<GenerationStep>("idle");
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState(detectedRole);
    const [profile, setProfile] = useState<string>("software_engineer");
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    // ATS Resume Generator is Premium-only feature
    const isPremium = userPlan === "premium";
    const canGenerate = isPremium && (exportLimit === -1 || exportsUsed < exportLimit);
    const isGenerating = generationStep !== "idle" && generationStep !== "complete" && generationStep !== "error";

    const handleGenerate = async () => {
        if (!resumeData || !canGenerate) return;

        setGenerationStep("normalizing");
        setError(null);

        try {
            // Simulate step progression for UX (real AI call happens in background)
            const stepPromise = (async () => {
                await new Promise(r => setTimeout(r, 2000));
                setGenerationStep("rewriting");
                await new Promise(r => setTimeout(r, 3000));
                setGenerationStep("optimizing");
            })();

            const response = await fetch("/api/resume/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    currentResume: resumeData,
                    targetRole: role,
                    profile: profile
                })
            });

            const data = await response.json();

            // Wait for step animation to at least reach optimizing
            await stepPromise;

            if (!data.success) {
                throw new Error(data.error || "Failed to generate resume");
            }

            setGenerationStep("complete");
            await new Promise(r => setTimeout(r, 1500)); // Show success briefly

            onGenerated(data.data);
            setIsOpen(false);
            setGenerationStep("idle");
        } catch (err) {
            setGenerationStep("error");
            setError((err as Error).message);
        }
    };

    // Animated Steps Component
    const GenerationSteps = () => {
        const steps = [
            { id: "normalizing", label: "Analyzing Structure & Normalizing Data" },
            { id: "rewriting", label: "AI Rewriting for Impact & Clarity" },
            { id: "optimizing", label: "Optimizing for ATS Keywords" },
        ];

        const getCurrentStepIndex = () => {
            if (generationStep === "complete") return 3;
            if (generationStep === "error") return -1;
            return steps.findIndex(s => s.id === generationStep);
        };

        const activeIndex = getCurrentStepIndex();

        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                {/* Main Icon Animation */}
                <div style={{
                    position: 'relative',
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            background: 'conic-gradient(from 0deg, transparent 0%, #6366f1 50%, #ec4899 100%)',
                            maskImage: 'radial-gradient(transparent 60%, black 61%)',
                            WebkitMaskImage: 'radial-gradient(transparent 60%, black 61%)',
                        }}
                    />

                    <div style={{
                        position: 'relative',
                        background: 'var(--bg-secondary, #1a1a24)',
                        borderRadius: '50%',
                        width: '70px',
                        height: '70px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                    }}>
                        {generationStep === "complete" ? (
                            <CheckCircle2 size={32} color="#22c55e" />
                        ) : generationStep === "error" ? (
                            <AlertCircle size={32} color="#ef4444" />
                        ) : (
                            <FileText size={32} color="white" style={{ opacity: 0.8 }} />
                        )}
                    </div>

                    {/* Floating sparkles */}
                    {generationStep !== "error" && [...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                y: [-10, -20, -10],
                                opacity: [0, 1, 0],
                                scale: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.6,
                                ease: "easeInOut",
                            }}
                            style={{
                                position: 'absolute',
                                top: -10,
                                right: -10 + (i * 15),
                                color: '#fbbf24',
                            }}
                        >
                            <Sparkles size={16} />
                        </motion.div>
                    ))}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                    {generationStep === "complete" ? "Resume Generated!" :
                        generationStep === "error" ? "Generation Failed" :
                            "Crafting Your Resume..."}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '32px' }}>
                    {generationStep === "error" ? error : `Applying best practices for ${role}`}
                </p>

                {/* Steps Progress */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '320px', margin: '0 auto' }}>
                    {steps.map((step, index) => {
                        const isCompleted = index < activeIndex;
                        const isActive = index === activeIndex;

                        return (
                            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {isCompleted ? (
                                        <CheckCircle2 size={20} color="#22c55e" />
                                    ) : isActive ? (
                                        <Loader2 size={20} color="#6366f1" className="animate-spin" />
                                    ) : (
                                        <Circle size={20} color="rgba(255,255,255,0.2)" />
                                    )}
                                </div>

                                <span style={{
                                    fontSize: '0.9rem',
                                    color: isActive || isCompleted ? '#fff' : 'rgba(255,255,255,0.4)',
                                    fontWeight: isActive ? 500 : 400,
                                    transition: 'color 0.3s',
                                }}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {generationStep === "error" && (
                    <button
                        onClick={() => {
                            setGenerationStep("idle");
                            setError(null);
                        }}
                        style={{
                            marginTop: '24px',
                            padding: '12px 24px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                )}

                <style jsx global>{`
                    .animate-spin {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => isPremium && setIsOpen(true)}
                disabled={!resumeData || !isPremium}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "20px 24px",
                    background: isPremium && resumeData ? "var(--gradient-primary)" : "var(--bg-tertiary)",
                    border: isPremium ? "none" : "1px solid var(--border-color)",
                    borderRadius: "16px",
                    cursor: isPremium && resumeData ? "pointer" : "not-allowed",
                    width: "100%",
                    opacity: isPremium && resumeData ? 1 : 0.7,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    position: "relative"
                }}
                onMouseEnter={(e) => isPremium && resumeData && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
                {/* Premium-only badge */}
                {!isPremium && (
                    <div style={{
                        position: "absolute",
                        top: "-8px",
                        right: "16px",
                        background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                        color: "#1a1a1a",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        Premium Only
                    </div>
                )}
                <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: isPremium ? "rgba(255,255,255,0.2)" : "var(--bg-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <Sparkles size={24} color={isPremium ? "white" : "#fbbf24"} />
                </div>
                <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{ color: isPremium ? "white" : "var(--text-primary)", fontWeight: 600, fontSize: "1.1rem" }}>
                        Generate ATS Resume
                    </div>
                    <div style={{ color: isPremium ? "rgba(255,255,255,0.8)" : "var(--text-secondary)", fontSize: "0.875rem" }}>
                        {isPremium ? "Create a role-optimized, submission-ready resume" : "Upgrade to Premium to unlock this feature"}
                    </div>
                </div>
                <FileText size={24} color={isPremium ? "white" : "var(--text-tertiary)"} />
            </button>
        );
    }

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
        }}>
            <div style={{
                background: "var(--bg-secondary)",
                borderRadius: "20px",
                padding: "32px",
                maxWidth: "500px",
                width: "100%",
                border: "1px solid var(--border-color)"
            }}>
                {/* Show loader when generating, form when idle */}
                {isGenerating || generationStep === "error" ? (
                    <GenerationSteps />
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "10px",
                                    background: "var(--gradient-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    <Sparkles size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Generate ATS Resume</h2>
                                    <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                        2-click resume generation
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: "var(--bg-tertiary)",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                <X size={20} color="var(--text-secondary)" />
                            </button>
                        </div>

                        {/* Target Role */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500 }}>
                                Target Role
                            </label>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    background: "var(--bg-tertiary)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "10px",
                                    fontSize: "1rem",
                                    color: "var(--text-primary)"
                                }}
                                placeholder="e.g., Software Engineer, Product Manager"
                            />
                            <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                Auto-detected from your resume. Edit if needed.
                            </p>
                        </div>

                        {/* Usage info */}
                        {!canGenerate && (
                            <div style={{
                                background: "rgba(245, 158, 11, 0.1)",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                borderRadius: "10px",
                                padding: "16px",
                                marginBottom: "20px",
                                textAlign: "center"
                            }}>
                                <p style={{ margin: 0, color: "#f59e0b", fontWeight: 500 }}>
                                    Export limit reached ({exportsUsed}/{exportLimit})
                                </p>
                                <a
                                    href="/pricing"
                                    style={{ color: "#f59e0b", textDecoration: "underline", fontSize: "0.875rem" }}
                                >
                                    Upgrade to export more
                                </a>
                            </div>
                        )}

                        {/* Generate button */}
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            style={{
                                width: "100%",
                                padding: "16px",
                                background: !canGenerate ? "var(--bg-tertiary)" : "var(--gradient-primary)",
                                border: "none",
                                borderRadius: "12px",
                                color: "white",
                                fontSize: "1rem",
                                fontWeight: 600,
                                cursor: !canGenerate ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            <Sparkles size={20} />
                            Generate ATS Resume
                        </button>

                        <p style={{
                            margin: "16px 0 0",
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            textAlign: "center"
                        }}>
                            AI will optimize your resume for {role || "your target role"}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

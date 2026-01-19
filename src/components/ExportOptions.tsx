
"use client";

import { useState } from "react";
import { Download, FileText, File, Loader2, Crown, Lock, Check, Wand2, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { GeneratorModal } from "./ResumeGenerator/GeneratorModal";
import { GenerationLoader } from "./ResumeGenerator/GenerationLoader";
import { NormalizedResume, TargetProfile } from "@/lib/types/resume-generator";

// Legacy type (parsed resume)
interface GeneratedResume {
    profile: {
        name: string;
        email: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        github?: string;
    };
    summary: string;
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

interface ExportOptionsProps {
    generatedResume: GeneratedResume | null;
    userId: string;
    userPlan: "free" | "pro" | "premium";
    exportsUsed: number;
    exportLimit: number;
    onExportComplete?: () => void;
}

export default function ExportOptions({
    generatedResume,
    userId,
    userPlan,
    exportsUsed,
    exportLimit,
    onExportComplete
}: ExportOptionsProps) {
    // ATS Generation State
    const [showModal, setShowModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState<"normalizing" | "rewriting" | "optimizing" | "complete">("normalizing");
    const [atsResume, setAtsResume] = useState<NormalizedResume | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Export State
    const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const canExport = exportLimit === -1 || exportsUsed < exportLimit;
    const canExportDOCX = userPlan !== "free";

    const handleGenerate = async (role: string, profile: TargetProfile) => {
        setShowModal(false);
        setIsGenerating(true);
        setGenerationError(null);
        setGenerationStep("normalizing");

        try {
            // Mocking progress for now (since API is skeletal)
            // Real implementation will likely use Server-Sent Events or just await the full process
            setTimeout(() => setGenerationStep("rewriting"), 3000);
            setTimeout(() => setGenerationStep("optimizing"), 6000);

            const response = await fetch("/api/resume/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentResume: generatedResume,
                    targetRole: role,
                    profile: profile
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Generation failed");
            }

            const data = await response.json();
            console.log("[ExportOptions] API response:", data);
            if (data.success && data.data) {
                console.log("[ExportOptions] Setting atsResume:", data.data);
                setAtsResume(data.data);
                setGenerationStep("complete");
                // Reset to view after short delay
                setTimeout(() => setIsGenerating(false), 1500);
            } else {
                throw new Error(data.error || "Failed to generate resume data");
            }

        } catch (err) {
            setGenerationError((err as Error).message);
            setIsGenerating(false);
        }
    };

    const handleExport = async (format: "pdf" | "docx") => {
        // Requirements say "User NEVER downloads an unformatted resume" for this flow.
        const resumeToExport = atsResume;

        if (!resumeToExport) {
            setError("Please generate an ATS resume first.");
            return;
        }

        if (!canExport) return;
        if (format === "docx" && !canExportDOCX) return;

        setExporting(format);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/resume/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    userPlan,
                    format,
                    resume: resumeToExport
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to export resume");
            }

            // Download logic (Base64)
            const byteCharacters = atob(data.file);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: data.contentType });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setSuccess(`${format.toUpperCase()} downloaded successfully!${data.watermarked ? " (Watermarked)" : ""}`);
            onExportComplete?.();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setExporting(null);
        }
    };

    if (isGenerating) {
        return (
            <div style={{
                background: "var(--bg-tertiary)",
                borderRadius: "16px",
                overflow: "hidden"
            }}>
                <GenerationLoader currentStep={generationStep} />
            </div>
        );
    }

    return (
        <div style={{
            background: "var(--bg-tertiary)",
            borderRadius: "16px",
            padding: "24px"
        }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 700 }}>
                    ATS Resume Suite
                </h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    Generate, optimize, and export your professional resume.
                </p>
            </div>

            {/* ERROR ALERT */}
            {generationError && (
                <div style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "20px",
                    color: "#ef4444",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}>
                    <AlertCircle size={18} />
                    {generationError}
                </div>
            )}

            {/* SECTION 1: GENERATOR */}
            <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff" }}>
                        1. Generic ATS Resume
                    </h4>
                    {atsResume && (
                        <span style={{ fontSize: "0.75rem", color: "var(--success-400)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Check size={12} /> Generated
                        </span>
                    )}
                </div>

                <div style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid var(--border-color)",
                }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px" }}>
                        Create a role-optimized, submission-ready resume based on your analysis.
                    </p>

                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            width: "100%",
                            padding: "12px",
                            background: atsResume ? "var(--bg-tertiary)" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                            border: atsResume ? "1px solid var(--primary-500)" : "none",
                            borderRadius: "10px",
                            color: atsResume ? "var(--primary-400)" : "#fff",
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.2s"
                        }}
                    >
                        {atsResume ? (
                            <>
                                <RefreshCw size={18} />
                                Regenerate Resume
                            </>
                        ) : (
                            <>
                                <Wand2 size={18} />
                                Generate ATS Resume
                            </>
                        )}
                    </button>
                    {atsResume && (
                        <p style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--text-tertiary)", textAlign: "center" }}>
                            Preview is available in the exported file.
                        </p>
                    )}
                </div>
            </div>

            {/* SECTION 2: EXPORT */}
            <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff" }}>
                        2. Export Options
                    </h4>
                    {/* Limits Badge */}
                    <div style={{
                        padding: "4px 8px",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: canExport ? "var(--text-secondary)" : "var(--warning-400)"
                    }}>
                        {exportsUsed} / {exportLimit === -1 ? "∞" : exportLimit} exports used
                    </div>
                </div>

                {!atsResume ? (
                    <div style={{
                        padding: "32px",
                        textAlign: "center",
                        border: "1px dashed var(--border-color)",
                        borderRadius: "12px",
                        color: "var(--text-tertiary)"
                    }}>
                        Generate a resume above to unlock export options.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Error/Success for Export */}
                        {error && (
                            <div style={{ color: "#ef4444", fontSize: "0.875rem", padding: "8px" }}>{error}</div>
                        )}
                        {success && (
                            <div style={{ color: "#22c55e", fontSize: "0.875rem", padding: "8px" }}>{success}</div>
                        )}

                        {/* PDF Export */}
                        <button
                            onClick={() => handleExport("pdf")}
                            disabled={!canExport || exporting !== null}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "16px",
                                background: canExport ? "var(--bg-secondary)" : "var(--bg-tertiary)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "12px",
                                cursor: canExport ? "pointer" : "not-allowed",
                                opacity: canExport ? 1 : 0.6,
                                transition: "background 0.2s"
                            }}
                        >
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: "rgba(239, 68, 68, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <FileText size={20} color="#ef4444" />
                            </div>
                            <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                    Download PDF
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                    {userPlan === "free" ? "Watermarked" : "Clean, professional PDF"}
                                </div>
                            </div>
                            {exporting === "pdf" ? (
                                <Loader2 size={20} className="animate-spin" color="var(--primary-400)" />
                            ) : (
                                <Download size={20} color="var(--text-secondary)" />
                            )}
                        </button>

                        {/* DOCX Export */}
                        <button
                            onClick={() => handleExport("docx")}
                            disabled={!canExport || !canExportDOCX || exporting !== null}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "16px",
                                background: canExportDOCX && canExport ? "var(--bg-secondary)" : "var(--bg-tertiary)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "12px",
                                cursor: canExportDOCX && canExport ? "pointer" : "not-allowed",
                                opacity: canExportDOCX && canExport ? 1 : 0.6,
                                transition: "background 0.2s"
                            }}
                        >
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: "rgba(59, 130, 246, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <File size={20} color="#3b82f6" />
                            </div>
                            <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                                    Download DOCX
                                    {!canExportDOCX && <Lock size={14} color="var(--warning-400)" />}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                    {canExportDOCX ? "Editable Word document" : "Requires Pro or Premium"}
                                </div>
                            </div>
                            {exporting === "docx" ? (
                                <Loader2 size={20} className="animate-spin" color="var(--primary-400)" />
                            ) : canExportDOCX ? (
                                <Download size={20} color="var(--text-secondary)" />
                            ) : (
                                <Crown size={20} color="var(--warning-400)" />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Upgrade Prompt */}
            {(!canExport || !canExportDOCX) && atsResume && (
                <Link
                    href="/pricing"
                    style={{
                        display: "block",
                        marginTop: "16px",
                        padding: "12px",
                        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                        borderRadius: "10px",
                        textAlign: "center",
                        textDecoration: "none"
                    }}
                >
                    <span style={{ color: "var(--primary-400)", fontWeight: 500, fontSize: "0.875rem" }}>
                        ✨ Upgrade for more exports and DOCX support
                    </span>
                </Link>
            )}

            <GeneratorModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onGenerate={handleGenerate}
            />
        </div>
    );
}

// Add global styles for animations
const style = `
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
.animate-spin {
    animation: spin 1s linear infinite;
}
`;

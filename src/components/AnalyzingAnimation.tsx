"use client";

import { Loader2 } from "lucide-react";

interface AnalyzingAnimationProps {
    isVisible: boolean;
    tier: "free" | "pro" | "premium";
    featureName: string;
    onComplete?: () => void;
}

export default function AnalyzingAnimation({ isVisible, tier, featureName }: AnalyzingAnimationProps) {
    if (!isVisible) return null;

    const tierColor = tier === "premium" ? "#8b5cf6" : tier === "pro" ? "#f59e0b" : "#6366f1";
    const tierGradient = tier === "premium"
        ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
        : tier === "pro"
            ? "linear-gradient(135deg, #f59e0b, #d97706)"
            : "linear-gradient(135deg, #6366f1, #4f46e5)";

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
        }}>
            <div style={{
                background: "var(--bg-secondary)",
                borderRadius: "24px",
                padding: "48px 64px",
                maxWidth: "380px",
                width: "90%",
                textAlign: "center",
                border: "1px solid var(--border-color)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}>
                {/* Spinning Wheel */}
                <div style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 24px",
                    position: "relative",
                }}>
                    <div style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        border: `4px solid rgba(255,255,255,0.1)`,
                        borderTopColor: tierColor,
                        animation: "spin 1s linear infinite",
                    }} />
                    <div style={{
                        position: "absolute",
                        inset: "12px",
                        borderRadius: "50%",
                        background: tierGradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        <Loader2 size={28} color="#fff" style={{ animation: "spin 2s linear infinite reverse" }} />
                    </div>
                </div>

                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>
                    Processing {featureName}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
                    Please wait...
                </p>

                <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "100px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    background: tier === "premium" ? "rgba(139, 92, 246, 0.2)" : tier === "pro" ? "rgba(245, 158, 11, 0.2)" : "rgba(99, 102, 241, 0.2)",
                    color: tier === "premium" ? "#a855f7" : tier === "pro" ? "#fbbf24" : "#818cf8",
                }}>
                    {tier === "premium" ? "⚡ Premium Speed" : tier === "pro" ? "🚀 Pro Speed" : "Standard"}
                </div>
            </div>

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, X, Zap, CheckCircle } from "lucide-react";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: string;
    currentUsage: number;
    limit: number;
}

export default function UpgradeModal({
    isOpen,
    onClose,
    feature,
    currentUsage,
    limit,
}: UpgradeModalProps) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "var(--space-6)",
            }}
            onClick={onClose}
        >
            <div
                className="card animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: "480px",
                    padding: "var(--space-8)",
                    textAlign: "center",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "var(--space-4)",
                        right: "var(--space-4)",
                        background: "none",
                        border: "none",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                    }}
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div
                    style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto var(--space-4)",
                    }}
                >
                    <Crown size={32} style={{ color: "var(--primary-400)" }} />
                </div>

                {/* Title */}
                <h2
                    style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        marginBottom: "var(--space-2)",
                    }}
                >
                    Limit Reached
                </h2>

                {/* Message */}
                <p className="text-secondary" style={{ marginBottom: "var(--space-4)" }}>
                    You've used <strong style={{ color: "var(--text-primary)" }}>{currentUsage}/{limit}</strong> {feature} this month.
                </p>

                {/* Upgrade benefits */}
                <div
                    className="card"
                    style={{
                        padding: "var(--space-4)",
                        background: "var(--bg-tertiary)",
                        marginBottom: "var(--space-6)",
                        textAlign: "left",
                    }}
                >
                    <p style={{ fontWeight: 600, marginBottom: "var(--space-3)", fontSize: "0.875rem" }}>
                        Upgrade to Pro and get:
                    </p>
                    <ul style={{ listStyle: "none", fontSize: "0.875rem" }}>
                        {[
                            "20 ATS Resume Scores/month",
                            "5 Compare Resume Scores/month",
                            "Interview Questions (up to 20)",
                            "5 Job Fit Score Checks/month",
                            "5 Resume Exports (PDF + DOCX)",
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2" style={{ marginBottom: "var(--space-2)" }}>
                                <CheckCircle size={14} style={{ color: "var(--success-400)" }} />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Price */}
                <div style={{ marginBottom: "var(--space-6)" }}>
                    <span
                        style={{
                            fontSize: "2rem",
                            fontWeight: 700,
                            color: "var(--success-400)",
                        }}
                    >
                        ₹99
                    </span>
                    <span className="text-secondary">/year</span>
                    <p className="text-secondary text-sm" style={{ marginTop: "var(--space-1)" }}>
                        That's less than ₹9/month!
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                        Maybe Later
                    </button>
                    <Link href="/pricing" className="btn btn-primary" style={{ flex: 1 }}>
                        <Zap size={16} />
                        Upgrade Now
                    </Link>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Sparkles, CheckCircle, X } from "lucide-react";

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: "pro" | "premium";
    userName?: string;
}

export default function PaymentSuccessModal({
    isOpen,
    onClose,
    planName,
    userName = "User"
}: PaymentSuccessModalProps) {
    const router = useRouter();
    const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

    useEffect(() => {
        if (isOpen) {
            // Generate confetti
            const pieces = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 2,
                color: ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 6)]
            }));
            setConfettiPieces(pieces);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isPremium = planName === "premium";
    const displayName = userName.split('@')[0]; // Remove email domain if email

    const handleExplore = () => {
        onClose();
        router.push("/dashboard");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.8)",
                    backdropFilter: "blur(8px)",
                    zIndex: 1000,
                    animation: "fadeIn 0.3s ease"
                }}
            />

            {/* Modal */}
            <div style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "90%",
                maxWidth: "420px",
                background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
                borderRadius: "24px",
                padding: "40px 32px",
                textAlign: "center",
                zIndex: 1001,
                border: `2px solid ${isPremium ? "rgba(251, 191, 36, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                boxShadow: `0 0 60px ${isPremium ? "rgba(251, 191, 36, 0.2)" : "rgba(34, 197, 94, 0.2)"}`,
                animation: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#9ca3af"
                    }}
                >
                    <X size={16} />
                </button>

                {/* Confetti */}
                {confettiPieces.map((piece) => (
                    <div
                        key={piece.id}
                        style={{
                            position: "absolute",
                            top: "-10px",
                            left: `${piece.left}%`,
                            width: "10px",
                            height: "10px",
                            background: piece.color,
                            borderRadius: "2px",
                            animation: `confettiFall 3s ease-out ${piece.delay}s forwards`,
                            opacity: 0
                        }}
                    />
                ))}

                {/* Success Icon */}
                <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: isPremium
                        ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                        : "linear-gradient(135deg, #22c55e, #16a34a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                    animation: "pulse 2s ease-in-out infinite",
                    boxShadow: isPremium
                        ? "0 0 40px rgba(251, 191, 36, 0.4)"
                        : "0 0 40px rgba(34, 197, 94, 0.4)"
                }}>
                    {isPremium ? <Crown size={36} color="#fff" /> : <CheckCircle size={36} color="#fff" />}
                </div>

                {/* Main Text */}
                <h2 style={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: "8px"
                }}>
                    🎉 Congratulations!
                </h2>

                <p style={{
                    fontSize: "1.1rem",
                    color: "#d1d5db",
                    marginBottom: "8px"
                }}>
                    {displayName},
                </p>

                <p style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    background: isPremium
                        ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                        : "linear-gradient(135deg, #22c55e, #16a34a)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "24px"
                }}>
                    You are now {isPremium ? "Premium" : "Pro"}! ✨
                </p>

                {/* Benefits */}
                <div style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "24px",
                    textAlign: "left"
                }}>
                    <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "12px" }}>
                        You now have access to:
                    </p>
                    <ul style={{ listStyle: "none", fontSize: "0.9rem" }}>
                        {isPremium ? (
                            <>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#fbbf24" /> Unlimited ATS Resume Scores
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#fbbf24" /> 5 ATS Resume Generations/month
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#fbbf24" /> 10 Resume Exports (PDF+DOCX)
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#fbbf24" /> Premium Speed (~3s analysis)
                                </li>
                            </>
                        ) : (
                            <>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#22c55e" /> 20 ATS Resume Scores/month
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#22c55e" /> Interview Questions AI
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#22c55e" /> Job Fit Score Analysis
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff" }}>
                                    <Sparkles size={14} color="#22c55e" /> Pro Speed (~7s analysis)
                                </li>
                            </>
                        )}
                    </ul>
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleExplore}
                    style={{
                        width: "100%",
                        padding: "16px 24px",
                        background: isPremium
                            ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                            : "linear-gradient(135deg, #22c55e, #16a34a)",
                        border: "none",
                        borderRadius: "12px",
                        color: isPremium ? "#000" : "#fff",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                        boxShadow: isPremium
                            ? "0 8px 24px rgba(251, 191, 36, 0.4)"
                            : "0 8px 24px rgba(34, 197, 94, 0.4)"
                    }}
                >
                    🚀 Explore Now
                </button>
            </div>

            {/* Animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.8); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1); 
                    }
                }
                @keyframes confettiFall {
                    0% {
                        opacity: 1;
                        transform: translateY(0) rotate(0deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(400px) rotate(720deg);
                    }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `}</style>
        </>
    );
}

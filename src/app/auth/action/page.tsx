"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { FileText, CheckCircle, XCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

function AuthActionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your request...");
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        if (!oobCode) {
            setStatus("error");
            setMessage("Invalid request. No confirmation code found.");
            return;
        }

        const handleAction = async () => {
            // Handle Email Verification
            if (mode === "verifyEmail") {
                try {
                    await applyActionCode(auth, oobCode);
                    setStatus("success");
                    setMessage("Email verified successfully!");

                    // Start Countdown
                    const timer = setInterval(() => {
                        setCountdown((prev) => {
                            if (prev <= 1) {
                                clearInterval(timer);
                                // Reload user to ensure emailVerified is true locally
                                const checkAuth = async () => {
                                    if (auth.currentUser) {
                                        try {
                                            await auth.currentUser.reload();
                                            router.push("/dashboard");
                                        } catch (e) {
                                            router.push("/login?verified=true");
                                        }
                                    } else {
                                        router.push("/login?verified=true");
                                    }
                                };
                                checkAuth();
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);

                } catch (error: any) {
                    console.error("Verification error:", error);
                    setStatus("error");
                    if (error.code === 'auth/expired-action-code') {
                        setMessage("This verification link has expired.");
                    } else if (error.code === 'auth/invalid-action-code') {
                        setMessage("This verification link is invalid or has already been used.");
                    } else {
                        setMessage(error.message || "An error occurred during verification.");
                    }
                }
            }
            // Handle Password Reset (Future placeholder)
            else if (mode === "resetPassword") {
                // For now just redirect to login or handle logic if needed
                setStatus("error");
                setMessage("Password reset handled separately. Please go to Login.");
            }
            else {
                setStatus("error");
                setMessage("Unknown action mode.");
            }
        };

        handleAction();
    }, [mode, oobCode, router]);


    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-6)',
            position: 'relative',
            background: '#0f0f1a',
            overflow: 'hidden',
        }}>
            {/* Background Effects */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
                zIndex: 0,
            }} />
            <div style={{
                position: 'fixed',
                top: '20%',
                left: '30%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                zIndex: 0,
            }} />

            <div style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                zIndex: 1,
                textAlign: 'center'
            }}>
                {/* Logo */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '32px',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        padding: '12px',
                        borderRadius: '14px',
                        boxShadow: '0 8px 20px -6px rgba(99, 102, 241, 0.5)',
                    }}>
                        <FileText size={24} color="white" />
                    </div>
                    <span style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        color: '#fff',
                    }}>
                        Resume<span style={{
                            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>Score</span>
                    </span>
                </div>

                {/* Status Content */}
                {status === "loading" && (
                    <div>
                        <Loader2 size={48} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Verifying...</h2>
                        <p style={{ color: '#94a3b8' }}>Please wait while we verify your request.</p>
                    </div>
                )}

                {status === "success" && (
                    <div>
                        <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '24px', display: 'inline-block' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Success!</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>{message}</p>

                        <div style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: '#a5b4fc',
                            padding: '12px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            fontSize: '0.9rem'
                        }}>
                            Redirecting to dashboard in <strong>{countdown}</strong> seconds...
                        </div>

                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Go to Dashboard Now <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {status === "error" && (
                    <div>
                        <XCircle size={48} color="#ef4444" style={{ marginBottom: '24px', display: 'inline-block' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Verification Failed</h2>
                        <p style={{ color: '#ef4444', marginBottom: '24px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>{message}</p>

                        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                            <button
                                onClick={() => router.push('/login')}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Back to Login
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
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

export default function AuthActionPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthActionContent />
        </Suspense>
    );
}

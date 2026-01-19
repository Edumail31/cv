"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Lock, LogIn } from "lucide-react";
import Link from "next/link";

interface AuthGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Loading state with skeleton
    if (loading) {
        return (
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
                <style jsx>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Not authenticated - show login prompt
    if (!user) {
        if (fallback) return <>{fallback}</>;

        return (
            <div style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px"
            }}>
                <div style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "24px",
                    padding: "48px",
                    textAlign: "center",
                    maxWidth: "400px"
                }}>
                    <div style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "20px",
                        background: "rgba(99, 102, 241, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 24px"
                    }}>
                        <Lock size={40} style={{ color: "#6366f1" }} />
                    </div>

                    <h1 style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#fff",
                        marginBottom: "12px"
                    }}>
                        Login Required
                    </h1>

                    <p style={{
                        color: "#9ca3af",
                        fontSize: "0.95rem",
                        marginBottom: "32px",
                        lineHeight: 1.6
                    }}>
                        Please sign in to access this feature. Create a free account to get started with AI-powered resume analysis.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Link href="/login" style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "14px 28px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            fontSize: "1rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            cursor: "pointer"
                        }}>
                            <LogIn size={18} />
                            Sign In
                        </Link>

                        <Link href="/" style={{
                            padding: "12px 24px",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "12px",
                            color: "#9ca3af",
                            fontSize: "0.9rem",
                            textDecoration: "none",
                            cursor: "pointer"
                        }}>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Authenticated - render children
    return <>{children}</>;
}

// Hook for getting user state
export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading, isAuthenticated: !!user };
}

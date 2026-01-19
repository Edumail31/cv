"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [error, setError] = useState("");

    useEffect(() => {
        const handleSignIn = async () => {
            if (typeof window === "undefined") return;

            const url = window.location.href;

            if (isSignInWithEmailLink(auth, url)) {
                // Get email from localStorage (saved during sendSignInLinkToEmail)
                let email = window.localStorage.getItem("emailForSignIn");

                if (!email) {
                    // If email isn't saved, prompt user
                    email = window.prompt("Please provide your email for confirmation");
                }

                if (!email) {
                    setError("Email is required to complete sign-in");
                    setStatus("error");
                    return;
                }

                try {
                    await signInWithEmailLink(auth, email, url);
                    window.localStorage.removeItem("emailForSignIn");
                    setStatus("success");

                    // Redirect after short delay
                    setTimeout(() => {
                        router.push("/dashboard");
                    }, 2000);
                } catch (err) {
                    console.error("Sign-in error:", err);
                    setError((err as Error).message);
                    setStatus("error");
                }
            } else {
                setError("Invalid sign-in link");
                setStatus("error");
            }
        };

        handleSignIn();
    }, [router]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
            padding: "24px",
        }}>
            <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "24px",
                padding: "48px",
                textAlign: "center",
                maxWidth: "400px",
            }}>
                {/* Logo */}
                <Link href="/" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    marginBottom: "32px",
                    textDecoration: "none",
                }}>
                    <div style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        padding: "12px",
                        borderRadius: "14px",
                    }}>
                        <FileText size={24} color="white" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "1.5rem", color: "#fff" }}>
                        Resume<span style={{
                            background: "linear-gradient(135deg, #6366f1, #ec4899)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}>Score</span>
                    </span>
                </Link>

                {status === "loading" && (
                    <>
                        <Loader2 size={48} style={{ color: "#6366f1", animation: "spin 1s linear infinite", marginBottom: "16px" }} />
                        <h2 style={{ color: "#fff", fontSize: "1.25rem", marginBottom: "8px" }}>
                            Signing you in...
                        </h2>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.9rem" }}>
                            Please wait while we verify your magic link
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle size={48} style={{ color: "#22c55e", marginBottom: "16px" }} />
                        <h2 style={{ color: "#22c55e", fontSize: "1.25rem", marginBottom: "8px" }}>
                            Success!
                        </h2>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.9rem" }}>
                            Redirecting to dashboard...
                        </p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <AlertCircle size={48} style={{ color: "#ef4444", marginBottom: "16px" }} />
                        <h2 style={{ color: "#ef4444", fontSize: "1.25rem", marginBottom: "8px" }}>
                            Sign-in Failed
                        </h2>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.9rem", marginBottom: "24px" }}>
                            {error || "Something went wrong"}
                        </p>
                        <Link
                            href="/login"
                            style={{
                                display: "inline-block",
                                padding: "12px 24px",
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                color: "#fff",
                                borderRadius: "12px",
                                textDecoration: "none",
                                fontWeight: 600,
                            }}
                        >
                            Back to Login
                        </Link>
                    </>
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

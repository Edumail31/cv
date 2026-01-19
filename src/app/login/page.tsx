"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Mail, Lock, ArrowRight, Chrome, Eye, EyeOff, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendSignInLinkToEmail,
    User
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { initSession } from "@/lib/resume-storage";

async function createUserDocument(user: User) {
    const userRef = doc(db, "users", user.uid);
    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split("@")[0],
                photoURL: user.photoURL || null,
                createdAt: serverTimestamp(),
                tier: "free",
                usage: {
                    resumeAnalyzer: 0,
                    resumeExports: 0,
                    lastResetDate: new Date()
                }
            });
        }
    } catch (e) {
        console.error("Error creating user document:", e);
    }
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const verified = searchParams.get("verified");

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Animation trigger on mount
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                await createUserDocument(userCred.user);
            }
            initSession();
            router.push("/dashboard");
        } catch (err: unknown) {
            let msg = "An error occurred";
            if (err instanceof Error) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const code = (err as any).code;
                if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
                    msg = "No user found with this email. Please sign up.";
                } else if (code === "auth/wrong-password") {
                    msg = "Incorrect password.";
                } else if (code === "auth/too-many-requests") {
                    msg = "Too many failed attempts. Try again later.";
                } else if (code === "auth/user-disabled") {
                    msg = "This account has been disabled.";
                } else {
                    msg = err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "");
                }
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await createUserDocument(result.user);
            initSession();
            router.push("/dashboard");
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage.replace("Firebase: ", ""));
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        if (!email) {
            setError("Please enter your email first");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const actionCodeSettings = {
                url: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "",
                handleCodeInApp: true,
            };
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            if (typeof window !== "undefined") {
                window.localStorage.setItem("emailForSignIn", email);
            }
            setMagicLinkSent(true);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage.replace("Firebase: ", ""));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-6)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated gradient background */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
                zIndex: -2,
            }} />

            {/* Animated floating orbs */}
            <div style={{
                position: 'fixed',
                top: '20%',
                left: '30%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'float1 8s ease-in-out infinite',
                pointerEvents: 'none',
                zIndex: -1,
            }} />
            <div style={{
                position: 'fixed',
                bottom: '20%',
                right: '20%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
                filter: 'blur(50px)',
                animation: 'float2 10s ease-in-out infinite',
                pointerEvents: 'none',
                zIndex: -1,
            }} />
            <div style={{
                position: 'fixed',
                top: '60%',
                left: '60%',
                width: '250px',
                height: '250px',
                background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)',
                filter: 'blur(40px)',
                animation: 'float3 7s ease-in-out infinite',
                pointerEvents: 'none',
                zIndex: -1,
            }} />

            {/* Card */}
            <div style={{
                width: '100%',
                maxWidth: '420px',
                padding: 'var(--space-8)',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                zIndex: 1,
                transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
                opacity: mounted ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* Logo */}
                <Link href="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '32px',
                    textDecoration: 'none',
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
                </Link>

                {/* Heading */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '24px',
                    transition: 'all 0.3s ease',
                }}>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        marginBottom: '8px',
                        color: '#fff',
                    }}>
                        {isLogin ? "Welcome Back" : "Create Account"}
                    </h1>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.9rem',
                    }}>
                        {isLogin ? "Sign in to continue building your resume" : "Start building your professional resume"}
                    </p>
                </div>

                {/* Magic Link Success */}
                {magicLinkSent ? (
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center',
                    }}>
                        <Sparkles size={32} style={{ color: '#22c55e', marginBottom: '12px' }} />
                        <h3 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>Check your email!</h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                            We sent a magic link to <strong>{email}</strong>
                        </p>
                        <button
                            onClick={() => setMagicLinkSent(false)}
                            style={{
                                marginTop: '16px',
                                color: '#6366f1',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            ← Back to login
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Verification Success */}
                        {verified && (
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                color: '#22c55e',
                                fontSize: '0.875rem',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <CheckCircle size={16} />
                                Email verified! Please sign in.
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                color: '#f87171',
                                fontSize: '0.875rem',
                                animation: 'shake 0.4s ease-in-out',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Google Sign In */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                padding: '14px 20px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                transition: 'all 0.2s ease',
                                marginBottom: '16px',
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            <Chrome size={20} />
                            Continue with Google
                        </button>

                        {/* Divider */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginBottom: '16px',
                        }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem' }}>or</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: 'rgba(255, 255, 255, 0.8)',
                                }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(255, 255, 255, 0.4)',
                                    }} />
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '14px 14px 14px 44px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#6366f1';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: 'rgba(255, 255, 255, 0.8)',
                                }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(255, 255, 255, 0.4)',
                                    }} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        style={{
                                            width: '100%',
                                            padding: '14px 44px 14px 44px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#6366f1';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '14px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'rgba(255, 255, 255, 0.4)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '14px 20px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 8px 20px -6px rgba(99, 102, 241, 0.5)',
                                    marginBottom: '12px',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(99, 102, 241, 0.6)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px -6px rgba(99, 102, 241, 0.5)';
                                }}
                            >
                                {loading ? (
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <>
                                        {isLogin ? "Sign In" : "Create Account"}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            {/* Magic Link Option */}
                            {isLogin && (
                                <button
                                    type="button"
                                    onClick={handleMagicLink}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '12px 20px',
                                        background: 'transparent',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: '12px',
                                        color: '#a5b4fc',
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.7 : 1,
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading) {
                                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                    }}
                                >
                                    <Sparkles size={16} />
                                    Sign in with Magic Link
                                </button>
                            )}
                        </form>

                        {/* Toggle */}
                        <p style={{
                            textAlign: 'center',
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginTop: '20px',
                        }}>
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError("");
                                }}
                                style={{
                                    color: '#a5b4fc',
                                    fontWeight: 600,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s ease',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#c4b5fd'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#a5b4fc'}
                            >
                                {isLogin ? "Sign Up" : "Sign In"}
                            </button>
                        </p>
                    </>
                )}
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(30px, -30px) rotate(5deg); }
                    50% { transform: translate(-20px, 20px) rotate(-5deg); }
                    75% { transform: translate(15px, 10px) rotate(3deg); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0); }
                    33% { transform: translate(-40px, 20px); }
                    66% { transform: translate(30px, -30px); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-25px, -25px); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}

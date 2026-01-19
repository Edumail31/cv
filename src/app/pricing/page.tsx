"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Zap, Shield, Crown, FileText, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";

// Declare Razorpay types
declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill?: { name?: string; email?: string };
    theme?: { color?: string };
}

interface RazorpayInstance {
    open: () => void;
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

// Region-based pricing
const PRICING = {
    INR: { pro: "₹99", premium: "₹299", symbol: "₹" },
    USD: { pro: "$5", premium: "$10", symbol: "$" }
};

export default function PricingPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [currency, setCurrency] = useState<"INR" | "USD">("INR");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successPlan, setSuccessPlan] = useState<"pro" | "premium">("pro");

    // Detect user region
    useEffect(() => {
        const detectRegion = async () => {
            try {
                // Use timezone to detect India vs others (simple approach)
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (timezone.startsWith("Asia/Kolkata") || timezone.startsWith("Asia/Calcutta")) {
                    setCurrency("INR");
                } else {
                    // Try IP-based detection for more accuracy
                    const res = await fetch("https://ipapi.co/json/", { cache: "force-cache" });
                    if (res.ok) {
                        const data = await res.json();
                        setCurrency(data.country_code === "IN" ? "INR" : "USD");
                    }
                }
            } catch {
                // Default to INR if detection fails
                setCurrency("INR");
            }
        };
        detectRegion();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleUpgrade = async (planName: string) => {
        if (!user) {
            router.push(`/login?plan=${planName}`);
            return;
        }

        setProcessingPlan(planName);

        try {
            // Create order with currency
            const orderRes = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planName, userId: user.uid, currency }),
            });

            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.error);

            // Open Razorpay
            const options: RazorpayOptions = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "ResumeScore",
                description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan - 1 Year`,
                order_id: orderData.orderId,
                handler: async (response: RazorpayResponse) => {
                    // Verify payment
                    const verifyRes = await fetch("/api/payment/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...response,
                            userId: user.uid,
                            plan: planName,
                        }),
                    });

                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        // Show beautiful success modal
                        setSuccessPlan(planName as "pro" | "premium");
                        setShowSuccessModal(true);
                    } else {
                        alert("Payment verification failed. Please contact support.");
                    }
                    setProcessingPlan(null);
                },
                prefill: {
                    name: user.displayName || user.email?.split("@")[0] || "",
                    email: user.email || "",
                },
                theme: {
                    color: "#6366f1",
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error("Payment error:", error);
            alert("Failed to initiate payment. Please try again.");
            setProcessingPlan(null);
        }
    };

    const plans = [
        {
            name: "Free",
            price: currency === "USD" ? "$0" : "₹0",
            period: "/forever",
            desc: "Perfect for students and early-career professionals",
            icon: <Zap size={32} style={{ color: "var(--primary-400)" }} />,
            features: [
                { text: "3 ATS Resume Scores/month", included: true },
                { text: "1 Compare Resume Score/month", included: true },
                { text: "ATS Compatibility Analysis", included: true },
                { text: "Basic AI Feedback", included: true },
                { text: "Resume Exports", included: false },
                { text: "ATS Resume Generator", included: false },
                { text: "Interview Questions AI", included: false },
                { text: "Job Fit Score", included: false },
                { text: "Standard Speed", included: true, note: "~10s analysis" },
            ],
            btnText: user ? "Current Plan" : "Get Started",
            planId: "free",
            primary: false,
            speed: "Standard"
        },
        {
            name: "Pro",
            price: PRICING[currency].pro,
            period: "/year",
            desc: "For active job seekers looking for an edge",
            icon: <Shield size={32} style={{ color: "#22c55e" }} />,
            features: [
                { text: "20 ATS Resume Scores/month", included: true },
                { text: "5 Compare Resume Scores/month", included: true },
                { text: "5 Interview Questions/month", included: true },
                { text: "5 Job Fit Score Checks/month", included: true },
                { text: "Resume Exports", included: false },
                { text: "ATS Resume Generator", included: false },
                { text: "Advanced AI Pro-Tips", included: true },
                { text: "Market Value Assessment", included: true },
                { text: "Pro Speed", included: true, note: "~7s analysis" },
            ],
            btnText: "Go Pro",
            planId: "pro",
            primary: true,
            badge: "Most Popular",
            speed: "Pro Speed"
        },
        {
            name: "Premium",
            price: PRICING[currency].premium,
            period: "/year",
            desc: "Unlimited power for high-stakes career moves",
            icon: <Crown size={32} style={{ color: "#fbbf24" }} />,
            features: [
                { text: "Unlimited ATS Resume Scores", included: true },
                { text: "20 Compare Resume Scores/month", included: true },
                { text: "10 Interview Questions/month", included: true },
                { text: "20 Job Fit Score Checks/month", included: true },
                { text: "3 Resume Exports/month (PDF + DOCX)", included: true },
                { text: "5 ATS Resume Generations/month", included: true },
                { text: "Expected Answers & Follow-ups", included: true },
                { text: "Premium Speed", included: true, note: "~3s analysis" },
            ],
            btnText: "Choose Premium",
            planId: "premium",
            primary: false,
            speed: "Premium Speed"
        }
    ];

    const comparisonData = [
        { feature: "ATS Resume Scores", free: "3/month", pro: "20/month", premium: "Unlimited" },
        { feature: "Compare Resume Scores", free: "1/month", pro: "5/month", premium: "20/month" },
        { feature: "Interview Questions", free: "❌", pro: "5/month", premium: "10/month" },
        { feature: "Job Fit Score", free: "❌", pro: "5/month", premium: "20/month" },
        { feature: "Resume Export (PDF+DOCX)", free: "❌", pro: "❌", premium: "3/month" },
        { feature: "ATS Resume Generator", free: "❌", pro: "❌", premium: "5/month" },
        { feature: "Expected Answers", free: "❌", pro: "❌", premium: "✓" },
        { feature: "Analysis Speed", free: "Standard (~10s)", pro: "Pro (~7s)", premium: "Premium (~3s)" },
        { feature: "AI Depth", free: "Basic", pro: "Advanced", premium: "Expert" },
    ];

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
            {/* Header */}
            <header style={{
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-color)",
                padding: "var(--space-4)",
                position: "sticky",
                top: 0,
                zIndex: 50
            }}>
                <div className="container flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <FileText size={24} style={{ color: "var(--primary-500)" }} />
                        <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>ResumeScore</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : user ? (
                            <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
                        ) : (
                            <>
                                <Link href="/login" className="text-secondary text-sm">Login</Link>
                                <Link href="/login" className="btn btn-primary btn-sm">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="container" style={{ padding: "var(--space-12) var(--space-6)" }}>
                <div style={{ textAlign: "center", marginBottom: "var(--space-12)" }}>
                    <h1 style={{ fontSize: "3rem", fontWeight: 800, marginBottom: "var(--space-4)" }}>
                        Invest in Your <span className="text-gradient">Future</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto", fontSize: "1.125rem" }}>
                        Choose the plan that fits your career goals. Get the insights you need to land your dream job faster.
                    </p>
                    {/* Currency indicator */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        marginTop: "var(--space-4)"
                    }}>
                        <span style={{
                            padding: "6px 12px",
                            background: "rgba(99, 102, 241, 0.1)",
                            borderRadius: "20px",
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            border: "1px solid rgba(99, 102, 241, 0.2)"
                        }}>
                            {currency === "INR" ? "🇮🇳 Prices in INR" : "🌍 Prices in USD"}
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "var(--space-6)",
                    maxWidth: "1200px",
                    margin: "0 auto var(--space-16)"
                }}>
                    {plans.map((plan, i) => (
                        <div key={i} className="card animate-fade-in-up" style={{
                            padding: "var(--space-8)",
                            display: "flex",
                            flexDirection: "column",
                            border: plan.primary ? "2px solid var(--primary-500)" : "1px solid var(--border-color)",
                            transform: plan.primary ? "scale(1.05)" : "none",
                            position: "relative",
                            background: "var(--bg-secondary)",
                            zIndex: plan.primary ? 10 : 1
                        }}>
                            {plan.badge && (
                                <div style={{
                                    position: "absolute",
                                    top: "-12px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "var(--primary-500)",
                                    color: "white",
                                    padding: "4px 12px",
                                    borderRadius: "var(--radius-full)",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase"
                                }}>
                                    {plan.badge}
                                </div>
                            )}

                            <div style={{ marginBottom: "var(--space-6)" }}>
                                {plan.icon}
                            </div>

                            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "var(--space-2)" }}>{plan.name}</h2>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "var(--space-4)", minHeight: "2.5rem" }}>
                                {plan.desc}
                            </p>

                            {/* Speed Badge */}
                            <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                background: plan.name === "Premium" ? "rgba(251, 191, 36, 0.1)" : plan.name === "Pro" ? "rgba(34, 197, 94, 0.1)" : "rgba(99, 102, 241, 0.1)",
                                borderRadius: "100px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: plan.name === "Premium" ? "#fbbf24" : plan.name === "Pro" ? "#22c55e" : "var(--primary-400)",
                                marginBottom: "var(--space-4)",
                                width: "fit-content"
                            }}>
                                <Sparkles size={12} />
                                {plan.speed}
                            </div>

                            <div style={{ marginBottom: "var(--space-6)" }}>
                                <span style={{ fontSize: "3rem", fontWeight: 800 }}>{plan.price}</span>
                                <span style={{ color: "var(--text-tertiary)" }}>{plan.period}</span>
                            </div>

                            <div style={{ flex: 1, marginBottom: "var(--space-8)" }}>
                                <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "var(--space-4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    What's included:
                                </h3>
                                <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", fontSize: "0.85rem" }}>
                                            {feature.included ? (
                                                <CheckCircle size={16} style={{ color: "#22c55e", flexShrink: 0, marginTop: "2px" }} />
                                            ) : (
                                                <XCircle size={16} style={{ color: "#6b7280", flexShrink: 0, marginTop: "2px" }} />
                                            )}
                                            <span style={{ color: feature.included ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                                                {feature.text}
                                                {feature.note && <span style={{ opacity: 0.7, fontSize: "0.75rem" }}> ({feature.note})</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {plan.planId === "free" ? (
                                <Link
                                    href={user ? "/dashboard" : "/login"}
                                    className="btn btn-secondary w-full"
                                    style={{ padding: "var(--space-4)" }}
                                >
                                    {user ? "Go to Dashboard" : "Get Started"}
                                    <ArrowRight size={18} />
                                </Link>
                            ) : (
                                <button
                                    onClick={() => handleUpgrade(plan.planId)}
                                    disabled={processingPlan === plan.planId}
                                    className={plan.primary ? "btn btn-primary w-full" : "btn btn-secondary w-full"}
                                    style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                                >
                                    {processingPlan === plan.planId ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            {plan.btnText}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Comparison Table */}
                <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                    <h2 style={{ fontSize: "2rem", fontWeight: 700, textAlign: "center", marginBottom: "var(--space-8)" }}>
                        Compare Plans
                    </h2>
                    <div className="card" style={{ overflow: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                                    <th style={{ padding: "var(--space-4)", textAlign: "left", fontWeight: 600 }}>Feature</th>
                                    <th style={{ padding: "var(--space-4)", textAlign: "center", fontWeight: 600 }}>Free</th>
                                    <th style={{ padding: "var(--space-4)", textAlign: "center", fontWeight: 600, color: "var(--primary-400)" }}>Pro</th>
                                    <th style={{ padding: "var(--space-4)", textAlign: "center", fontWeight: 600, color: "#fbbf24" }}>Premium</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonData.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 500 }}>{row.feature}</td>
                                        <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "center", color: "var(--text-secondary)" }}>{row.free}</td>
                                        <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "center" }}>{row.pro}</td>
                                        <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "center" }}>{row.premium}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Payment Success Modal */}
            <PaymentSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                planName={successPlan}
                userName={user?.displayName || user?.email?.split('@')[0] || 'User'}
            />
        </div>
    );
}

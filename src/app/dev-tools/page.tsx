"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { Shield, RefreshCw, CheckCircle, AlertTriangle, Crown, Terminal } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDefaultUsage, PlanType } from "@/lib/usage";

export default function DevToolsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
    const [currentData, setCurrentData] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchUserData(currentUser.uid);
            } else {
                setCurrentData({ error: "Not logged in" });
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchUserData = async (uid: string) => {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setCurrentData(docSnap.data());
            } else {
                setCurrentData({ info: "No user document yet. Click a plan button to create one." });
            }
        } catch (e) {
            console.error("Error fetching user data:", e);
            setCurrentData({ error: String(e) });
        }
    };

    const updatePlan = async (plan: PlanType) => {
        if (!user) {
            setMessage({ type: "error", text: "Not logged in" });
            return;
        }
        setLoading(true);
        setMessage(null);

        try {
            const userRef = doc(db, "users", user.uid);

            // Use setDoc with merge to create doc if it doesn't exist
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                tier: plan,
                subscription: {
                    plan,
                    status: "active",
                    startDate: serverTimestamp(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    paymentId: "dev_bypass_" + Date.now()
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

            await fetchUserData(user.uid);
            setMessage({ type: "success", text: `Successfully set to ${plan.toUpperCase()}! Refresh page to see changes.` });
        } catch (error) {
            console.error("Error updating plan:", error);
            setMessage({ type: "error", text: "Failed to update plan: " + String(error) });
        } finally {
            setLoading(false);
        }
    };

    const resetUsage = async () => {
        if (!user) return;
        setLoading(true);
        setMessage(null);

        try {
            const userRef = doc(db, "users", user.uid);
            const defaultUsage = getDefaultUsage(); // This returns FeatureUsage

            // Create a usage object that satisfies both new and potentially legacy structures if needed
            // But since usage.ts defines FeatureUsage, we strictly follow that.
            // If user-service expects something else, we rely on usage.ts source of truth.

            await updateDoc(userRef, {
                featureUsage: defaultUsage, // Update new field
                usage: { ...defaultUsage, aiEnhancements: 0 }, // Update legacy field just in case
                monthlyAnalyses: 0, // Reset legacy field
                "featureUsage.lastUsed": null,
                updatedAt: serverTimestamp()
            });

            await fetchUserData(user.uid);
            setMessage({ type: "success", text: "Usage limits reset to 0" });
        } catch (error) {
            console.error("Error resetting usage:", error);
            setMessage({ type: "error", text: "Failed to reset usage" });
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: { padding: "32px", maxWidth: "800px", margin: "0 auto" },
        header: { marginBottom: "32px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" },
        title: { fontSize: "2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "12px", color: "#ec4899" },
        card: { background: "var(--bg-secondary)", borderRadius: "16px", padding: "24px", marginBottom: "24px", border: "1px solid var(--border-color)" },
        sectionTitle: { fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" },
        grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" },
        button: { padding: "12px 16px", borderRadius: "8px", border: "none", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" },
        codeBase: { background: "#1e1e1e", padding: "16px", borderRadius: "8px", fontSize: "0.85rem", overflowX: "auto" as const, color: "#d4d4d4", fontFamily: "monospace" },
        alert: { padding: "12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "0.9rem" },
    };

    return (
        <SidebarLayout>
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        <Terminal size={32} />
                        Developer Tools
                    </h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                        Tools for testing subscription tiers and usage limits locally.
                        <br />
                        <span style={{ fontSize: "0.8rem", color: "#ec4899" }}>⚠ Visible only in development mode</span>
                    </p>
                </div>

                {message && (
                    <div style={{
                        ...styles.alert,
                        background: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: message.type === "success" ? "#22c55e" : "#ef4444",
                        border: `1px solid ${message.type === "success" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                    }}>
                        {message.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        {message.text}
                    </div>
                )}

                <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>
                        <Crown size={20} color="#f59e0b" />
                        Plan Management
                    </h3>
                    <div style={styles.grid}>
                        <button
                            onClick={() => updatePlan("free")}
                            disabled={loading}
                            style={{ ...styles.button, background: "#374151", color: "#fff" }}
                        >
                            Set to FREE
                        </button>
                        <button
                            onClick={() => updatePlan("pro")}
                            disabled={loading}
                            style={{ ...styles.button, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
                        >
                            Set to PRO
                        </button>
                        <button
                            onClick={() => updatePlan("premium")}
                            disabled={loading}
                            style={{ ...styles.button, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff" }}
                        >
                            Set to PREMIUM
                        </button>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>
                        <RefreshCw size={20} color="#22c55e" />
                        Usage Limits
                    </h3>
                    <p style={{ marginBottom: "16px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        Reset all feature usage counts to 0 to simulate a fresh month.
                    </p>
                    <button
                        onClick={resetUsage}
                        disabled={loading}
                        style={{ ...styles.button, background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)", width: "100%" }}
                    >
                        Reset All Feature Usage
                    </button>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>
                        <Shield size={20} color="#94a3b8" />
                        Current User State
                    </h3>
                    <pre style={styles.codeBase}>
                        {currentData ? JSON.stringify(currentData, null, 2) : "Loading..."}
                    </pre>
                </div>
            </div>
        </SidebarLayout>
    );
}

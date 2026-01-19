"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    Home, FileText, BarChart3, MessageSquare, Building2, Crown,
    User as UserIcon, LogOut, Menu, X, Lock, Sparkles, Calendar
} from "lucide-react";
import SessionManager from "./SessionManager";
import { clearSession } from "@/lib/resume-storage";

interface SidebarLayoutProps {
    children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [userTier, setUserTier] = useState<"free" | "pro" | "premium">("free");
    const [memberSince, setMemberSince] = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserTier(data.tier || "free");
                        // Get member since date
                        if (data.createdAt) {
                            const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                            setMemberSince(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                        } else if (currentUser.metadata.creationTime) {
                            const date = new Date(currentUser.metadata.creationTime);
                            setMemberSince(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                        }
                    } else if (currentUser.metadata.creationTime) {
                        const date = new Date(currentUser.metadata.creationTime);
                        setMemberSince(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                    }
                } catch (e) {
                    console.error("Error fetching user data:", e);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        clearSession(); // Clear resume and session data
        await signOut(auth);
        router.push("/login");
    };

    const menuItems = [
        { id: "home", label: "Home", icon: <Home size={20} />, path: "/", available: true },
        { id: "analyse", label: "ATS Resume Score", icon: <FileText size={20} />, path: "/analyse", available: true },
        { id: "compare", label: "Compare Scores", icon: <BarChart3 size={20} />, path: "/compare", available: true, pro: true },
        { id: "interview", label: "Interview Questions", icon: <MessageSquare size={20} />, path: "/interview", available: true, pro: true },
        { id: "company", label: "Job Fit Score", icon: <Building2 size={20} />, path: "/company", available: true, pro: true },
        { id: "dashboard", label: "Dashboard", icon: <Crown size={20} />, path: "/dashboard", available: true },
    ];

    const isActive = (path: string) => pathname === path;

    const getUpgradeText = () => {
        if (userTier === "free") return "Upgrade to Pro";
        if (userTier === "pro") return "Upgrade to Premium";
        return null;
    };

    return (
        <SessionManager>
            <div style={{ display: "flex", minHeight: "100vh", background: "#0f0f1a" }}>
                {/* Sidebar */}
                <aside style={{
                    width: sidebarOpen ? "260px" : "0px",
                    background: "#1a1a2e",
                    borderRight: "1px solid rgba(255,255,255,0.1)",
                    display: "flex", flexDirection: "column",
                    transition: "width 0.3s ease",
                    overflow: "hidden",
                    position: "fixed",
                    height: "100vh",
                    zIndex: 100
                }}>
                    {/* Logo */}
                    <div style={{
                        padding: "20px 20px",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        display: "flex", alignItems: "center", gap: "12px"
                    }}>
                        <div style={{
                            width: "36px", height: "36px", borderRadius: "10px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                            <FileText size={20} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>ResumeScore</div>
                            <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>AI Resume Analyser</div>
                        </div>
                    </div>

                    {/* User Profile */}
                    {user && (
                        <div style={{
                            padding: "16px 20px",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                    width: "44px", height: "44px", borderRadius: "50%",
                                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#fff", fontWeight: 600, fontSize: "1.125rem"
                                }}>
                                    {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 600, color: "#fff", fontSize: "0.9rem",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                    }}>
                                        {user.displayName || user.email?.split('@')[0] || "User"}
                                    </div>
                                    <div style={{
                                        fontSize: "0.7rem", color: "#9ca3af",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                    }}>
                                        {user.email}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                                <span style={{
                                    background: "#22c55e", color: "#fff", padding: "2px 8px",
                                    borderRadius: "12px", fontSize: "0.6rem", fontWeight: 600
                                }}>✓ Verified</span>
                                <span style={{
                                    background: userTier === "premium" ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                                        : userTier === "pro" ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                            : "#6b7280",
                                    color: "#fff", padding: "2px 8px",
                                    borderRadius: "12px", fontSize: "0.6rem", fontWeight: 600
                                }}>{userTier.toUpperCase()}</span>
                            </div>
                            {memberSince && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", color: "#6b7280", fontSize: "0.7rem" }}>
                                    <Calendar size={12} />
                                    Member since {memberSince}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation Menu */}
                    <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => item.available && router.push(item.path)}
                                disabled={!item.available}
                                style={{
                                    width: "100%",
                                    display: "flex", alignItems: "center", gap: "12px",
                                    padding: "10px 14px", marginBottom: "2px",
                                    background: isActive(item.path)
                                        ? "rgba(99, 102, 241, 0.2)"
                                        : "transparent",
                                    border: isActive(item.path) ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                                    borderRadius: "10px",
                                    color: !item.available
                                        ? "#6b7280"
                                        : isActive(item.path)
                                            ? "#6366f1"
                                            : "#d1d5db",
                                    cursor: item.available ? "pointer" : "not-allowed",
                                    textAlign: "left", fontSize: "0.85rem",
                                    transition: "all 0.2s ease",
                                    opacity: item.available ? 1 : 0.7
                                }}
                            >
                                {item.icon}
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {item.pro && userTier === "free" && (
                                    <span style={{
                                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                        color: "#fff",
                                        padding: "2px 6px", borderRadius: "4px", fontSize: "0.6rem"
                                    }}>PRO</span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Bottom Actions */}
                    <div style={{
                        padding: "12px 10px",
                        borderTop: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        {/* Logout */}
                        {user && (
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: "100%", display: "flex", alignItems: "center", gap: "12px",
                                    padding: "10px 14px", background: "transparent", border: "none",
                                    borderRadius: "10px", cursor: "pointer",
                                    color: "#ef4444", fontSize: "0.85rem"
                                }}
                            >
                                <LogOut size={20} />
                                <span>Logout</span>
                            </button>
                        )}

                        {/* Dev Tools Button - Only in development */}
                        {process.env.NODE_ENV === 'development' && (
                            <div style={{ padding: "12px 16px", marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                <button
                                    onClick={() => router.push("/dev-tools")}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        background: "rgba(236, 72, 153, 0.1)",
                                        border: "1px solid rgba(236, 72, 153, 0.2)",
                                        borderRadius: "8px",
                                        padding: "10px",
                                        color: "#ec4899",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        fontWeight: 600
                                    }}
                                >
                                    <span style={{ flex: 1 }}>🛠️ Dev Tools</span>
                                </button>
                            </div>
                        )}

                        {/* Upgrade Button - Only for free or pro users */}
                        {getUpgradeText() && (
                            <button
                                onClick={() => router.push("/pricing")}
                                style={{
                                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                    padding: "12px 14px", marginTop: "8px",
                                    background: userTier === "pro"
                                        ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                                        : "linear-gradient(135deg, #f59e0b, #d97706)",
                                    border: "none", borderRadius: "10px", cursor: "pointer",
                                    color: "#fff", fontSize: "0.85rem", fontWeight: 600
                                }}
                            >
                                <Sparkles size={16} />
                                {getUpgradeText()}
                            </button>
                        )}
                    </div>
                </aside>

                {/* Mobile Toggle */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{
                        position: "fixed", top: "16px", left: sidebarOpen ? "272px" : "16px",
                        zIndex: 101, width: "36px", height: "36px",
                        background: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "left 0.3s ease"
                    }}
                >
                    {sidebarOpen ? <X size={18} color="#fff" /> : <Menu size={18} color="#fff" />}
                </button>

                {/* Main Content */}
                <main style={{
                    flex: 1,
                    marginLeft: sidebarOpen ? "260px" : "0",
                    transition: "margin-left 0.3s ease",
                    minHeight: "100vh"
                }}>
                    {children}
                </main>
            </div>
        </SessionManager>
    );
}

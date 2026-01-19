"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    initSession,
    isSessionExpired,
    clearSession,
    updateSessionActivity,
    getStoredResume,
    clearStoredResume
} from "@/lib/resume-storage";

export function SessionManager({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Check for session expiry
        const checkSession = () => {
            if (auth.currentUser && isSessionExpired()) {
                console.log("[Session] Auto sign-out after 15 days");
                signOut(auth);
                clearSession();
            }
        };

        // Check for expired resumes (3 minute expiry)
        const checkResumeExpiry = () => {
            const stored = getStoredResume();
            if (!stored) return;

            if (Date.now() > stored.expiresAt) {
                console.log("[Resume] Auto-deleted after 3 minutes");
                clearStoredResume();
            }
        };

        // Initialize session on auth state change
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Initialize session if new login
                initSession();

                // Check if session has expired (15 days since sign in)
                if (isSessionExpired()) {
                    console.log("[Session] Auto sign-out after 15 days");
                    signOut(auth);
                    clearSession();
                    return;
                }

                // Update activity on any state change
                updateSessionActivity();
            } else {
                // User is signed out - don't call clearSession here
                // as it could interfere with the login process
            }
        });

        // Check for expired resumes (3 minute expiry)
        checkResumeExpiry();

        // Periodic checks
        const sessionInterval = setInterval(checkSession, 60 * 1000); // Every minute
        const resumeInterval = setInterval(checkResumeExpiry, 30 * 1000); // Every 30 seconds

        // Track activity
        const handleActivity = () => {
            if (auth.currentUser) {
                updateSessionActivity();
            }
        };

        window.addEventListener("click", handleActivity);
        window.addEventListener("keydown", handleActivity);

        return () => {
            unsubscribe();
            clearInterval(sessionInterval);
            clearInterval(resumeInterval);
            window.removeEventListener("click", handleActivity);
            window.removeEventListener("keydown", handleActivity);
        };
    }, []);

    return <>{children}</>;
}

export default SessionManager;

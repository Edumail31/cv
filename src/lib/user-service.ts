import { db } from "./firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    serverTimestamp,
} from "firebase/firestore";
import {
    FeatureUsage,
    PlanType,
    getDefaultUsage,
    getDefaultSubscription,
    shouldResetUsage,
    canUseAI,
    canCreateResume,
    PLAN_LIMITS,
} from "./usage";

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    subscription: {
        plan: PlanType;
        status: "active" | "expired" | "cancelled";
        startDate?: Date;
        endDate?: Date;
        paymentId?: string;
    };
    usage: FeatureUsage;
    createdAt: Date;
    updatedAt: Date;
}

// Get or create user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            const plan = data.subscription?.plan || "free";
            const usage = data.usage || getDefaultUsage();
            const lastResetDate = usage.lastResetDate?.seconds
                ? new Date(usage.lastResetDate.seconds * 1000)
                : new Date(usage.lastResetDate || Date.now());

            // Check if usage should be reset based on plan
            if (shouldResetUsage(lastResetDate, plan)) {
                // Reset usage
                const resetUsage = getDefaultUsage();
                await updateDoc(userRef, {
                    usage: resetUsage,
                    updatedAt: serverTimestamp(),
                });
                return {
                    ...data,
                    usage: resetUsage,
                } as UserProfile;
            }

            return {
                ...data,
                usage: {
                    ...usage,
                    lastResetDate,
                },
            } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
}

// Create new user profile
export async function createUserProfile(
    uid: string,
    email: string,
    displayName?: string
): Promise<void> {
    try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
            uid,
            email,
            displayName: displayName || null,
            subscription: getDefaultSubscription(),
            usage: getDefaultUsage(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating user profile:", error);
        throw error;
    }
}

// Increment AI usage
export async function incrementUsage(
    uid: string,
    action: "aiEnhancements"
): Promise<{ success: boolean; error?: string }> {
    try {
        const profile = await getUserProfile(uid);
        if (!profile) {
            return { success: false, error: "User not found" };
        }

        // Check if action is allowed
        const check = canUseAI(profile.usage, profile.subscription.plan);

        if (!check.allowed) {
            return {
                success: false,
                error: `Limit reached. You've used ${check.limit} ${action}. Upgrade for more.`,
            };
        }

        // Increment the usage
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            [`usage.${action}`]: increment(1),
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error("Error incrementing usage:", error);
        return { success: false, error: "Failed to update usage" };
    }
}

// Check if user can use AI (called from API)
export async function checkAILimit(
    uid: string
): Promise<{ allowed: boolean; remaining: number; limit: number; error?: string }> {
    try {
        const profile = await getUserProfile(uid);
        if (!profile) {
            return { allowed: false, remaining: 0, limit: 0, error: "User not found" };
        }

        return canUseAI(profile.usage, profile.subscription.plan);
    } catch (error) {
        console.error("Error checking AI limit:", error);
        return { allowed: false, remaining: 0, limit: 0, error: "Failed to check limit" };
    }
}

// Check if user can create more resumes
export async function checkResumeLimit(
    uid: string,
    currentCount: number
): Promise<{ allowed: boolean; remaining: number; limit: number; error?: string }> {
    try {
        const profile = await getUserProfile(uid);
        if (!profile) {
            return { allowed: false, remaining: 0, limit: 0, error: "User not found" };
        }

        return canCreateResume(currentCount, profile.subscription.plan);
    } catch (error) {
        console.error("Error checking resume limit:", error);
        return { allowed: false, remaining: 0, limit: 0, error: "Failed to check limit" };
    }
}

// Upgrade user plan
export async function upgradePlan(
    uid: string,
    plan: PlanType,
    paymentId: string
): Promise<void> {
    try {
        const userRef = doc(db, "users", uid);
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription

        await updateDoc(userRef, {
            subscription: {
                plan,
                status: "active",
                startDate: serverTimestamp(),
                endDate,
                paymentId,
            },
            // Reset usage on upgrade
            usage: getDefaultUsage(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error upgrading plan:", error);
        throw error;
    }
}

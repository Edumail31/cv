// Usage limits by plan - Updated for AI Career Intelligence Platform
export const PLAN_LIMITS = {
    free: {
        resumeAnalyzer: 3,           // 3 per month
        resumeComparison: 1,         // 1 per month (partial output)
        interviewQuestions: 0,       // locked
        companyCompatibility: 0,     // locked
        resumeExports: 0,            // locked (Premium only)
        atsResumeGenerator: 0,       // locked (Premium only)
        aiDepth: "basic" as const,
        resetPeriod: "monthly" as const,
        speed: "standard" as const,
        analysisDelay: 10000,        // 10 seconds
    },
    pro: {
        resumeAnalyzer: 20,          // 20 per month
        resumeComparison: 5,         // 5 per month
        interviewQuestions: 5,       // 5 per month (50 questions each)
        companyCompatibility: 5,     // 5 per month
        resumeExports: 0,            // locked (Premium only)
        atsResumeGenerator: 0,       // locked (Premium only)
        aiDepth: "medium" as const,
        resetPeriod: "monthly" as const,
        speed: "pro" as const,
        analysisDelay: 7000,         // 7 seconds
    },
    premium: {
        resumeAnalyzer: -1,          // unlimited
        resumeComparison: 20,        // 20 per month
        interviewQuestions: 10,      // 10 per month (100 questions each)
        companyCompatibility: 20,    // 20 per month
        resumeExports: 3,            // 3 per month (PDF + DOCX, Premium only)
        atsResumeGenerator: 5,       // 5 per month (Premium exclusive)
        aiDepth: "high" as const,
        resetPeriod: "monthly" as const,
        speed: "premium" as const,
        analysisDelay: 3000,         // 3 seconds
    },
};

export type PlanType = "free" | "pro" | "premium";
export type AIDepth = "basic" | "medium" | "high";
export type FeatureType = "resumeAnalyzer" | "resumeComparison" | "interviewQuestions" | "companyCompatibility" | "resumeExports" | "atsResumeGenerator";
export type ResetPeriod = "weekly" | "monthly";

export interface FeatureUsage {
    resumeAnalyzer: number;
    resumeComparison: number;
    interviewQuestions: number;
    companyCompatibility: number;
    resumeExports: number;
    atsResumeGenerator: number;
    lastResetDate: Date;
}

export interface UserSubscription {
    plan: PlanType;
    status: "active" | "expired" | "cancelled";
    startDate?: Date;        // When subscription began
    endDate?: Date;          // Expiry date (startDate + 12 months for paid)
    lastResetDate?: Date;    // Monthly reset anchor (from purchase date for paid)
    paymentId?: string;
    orderId?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    subscription: UserSubscription;
    usage: FeatureUsage;
    createdAt: Date;
    updatedAt: Date;
}

// Calculate days until reset based on plan
export function getDaysUntilReset(lastResetDate: Date, plan: PlanType): number {
    const now = new Date();
    const lastReset = new Date(lastResetDate);
    const resetPeriod: string = PLAN_LIMITS[plan].resetPeriod;

    if (resetPeriod === "weekly") {
        const nextReset = new Date(lastReset.getTime() + 7 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysLeft);
    } else {
        // Reset every 30 days (rolling)
        const nextReset = new Date(lastReset.getTime() + 30 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysLeft);
    }
}

// Check if usage should be reset
export function shouldResetUsage(lastResetDate: Date, plan: PlanType): boolean {
    const now = new Date();
    const lastReset = new Date(lastResetDate);
    const resetPeriod: string = PLAN_LIMITS[plan].resetPeriod;

    if (resetPeriod === "weekly") {
        // Check if 7 days have passed
        const diffTime = Math.abs(now.getTime() - lastReset.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 7 && now > lastReset;
    } else {
        // Check if 30 days have passed
        const diffTime = now.getTime() - lastReset.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 30;
    }
}

// Check if user can use a specific feature
export function canUseFeature(
    usage: FeatureUsage,
    plan: PlanType,
    feature: FeatureType
): { allowed: boolean; remaining: number; limit: number } {
    const limit = PLAN_LIMITS[plan][feature];
    const current = usage[feature];

    // Feature is locked for this plan
    if (limit === 0) {
        return { allowed: false, remaining: 0, limit: 0 };
    }

    // Unlimited usage
    if (limit === -1) {
        return { allowed: true, remaining: -1, limit: -1 };
    }

    const remaining = limit - current;
    return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        limit,
    };
}

// Get AI depth for plan
export function getAIDepth(plan: PlanType): AIDepth {
    return PLAN_LIMITS[plan].aiDepth;
}

// Get default usage for new users
export function getDefaultUsage(): FeatureUsage {
    return {
        resumeAnalyzer: 0,
        resumeComparison: 0,
        interviewQuestions: 0,
        companyCompatibility: 0,
        resumeExports: 0,
        atsResumeGenerator: 0,
        lastResetDate: new Date(),
    };
}

// Get default subscription for new users
export function getDefaultSubscription(): UserSubscription {
    return {
        plan: "free",
        status: "active",
    };
}

// Get plan display name
export function getPlanDisplayName(plan: PlanType): string {
    switch (plan) {
        case "free": return "Free";
        case "pro": return "Pro";
        case "premium": return "Premium";
    }
}

// Get reset period display
export function getResetPeriodDisplay(plan: PlanType): string {
    const period: string = PLAN_LIMITS[plan].resetPeriod;
    return period === "weekly" ? "week" : "month";
}

// Check if feature is available for plan (not locked)
export function isFeatureAvailable(plan: PlanType, feature: FeatureType): boolean {
    return PLAN_LIMITS[plan][feature] !== 0;
}

// Get token budget based on plan and feature
export function getTokenBudget(plan: PlanType, feature: FeatureType): number {
    const budgets: Record<FeatureType, Record<AIDepth, number>> = {
        resumeAnalyzer: { basic: 800, medium: 1500, high: 2500 },
        resumeComparison: { basic: 600, medium: 1400, high: 2200 },
        interviewQuestions: { basic: 0, medium: 1200, high: 2000 },
        companyCompatibility: { basic: 0, medium: 1000, high: 2500 },
        resumeExports: { basic: 500, medium: 800, high: 1200 },
        atsResumeGenerator: { basic: 0, medium: 0, high: 2000 },
    };

    const depth = getAIDepth(plan);
    return budgets[feature][depth];
}

// ========================
// BACKWARDS COMPATIBILITY
// ========================

// Legacy type alias - maps to FeatureUsage with aiEnhancements alias
export interface UserUsage {
    aiEnhancements: number;
    lastResetDate: Date;
}

// Legacy function - maps to canUseFeature for resumeAnalyzer
export function canUseAI(
    usage: UserUsage | FeatureUsage,
    plan: PlanType
): { allowed: boolean; remaining: number; limit: number } {
    // Handle both old UserUsage format and new FeatureUsage format
    const featureUsage: FeatureUsage = 'aiEnhancements' in usage
        ? {
            resumeAnalyzer: usage.aiEnhancements,
            resumeComparison: 0,
            interviewQuestions: 0,
            companyCompatibility: 0,
            resumeExports: 0,
            atsResumeGenerator: 0,
            lastResetDate: usage.lastResetDate
        }
        : usage;

    return canUseFeature(featureUsage, plan, "resumeAnalyzer");
}

// Legacy function - check if user can create more resumes (now just returns true)
export function canCreateResume(
    resumeCount: number,
    plan: PlanType
): { allowed: boolean; remaining: number; limit: number } {
    // Resume creation is now unlimited, but keeping the function for backwards compat
    return { allowed: true, remaining: -1, limit: -1 };
}

// ========================
// SUBSCRIPTION MANAGEMENT
// ========================

/**
 * Check if a paid subscription has expired
 * Returns true if the current date is past the endDate
 */
export function isSubscriptionExpired(subscription: UserSubscription | null | undefined): boolean {
    if (!subscription) return true;
    if (subscription.plan === "free") return false; // Free never expires
    if (!subscription.endDate) return false; // No end date means no expiry

    const endDate = subscription.endDate instanceof Date
        ? subscription.endDate
        : new Date(subscription.endDate);
    return new Date() > endDate;
}

/**
 * Get days until subscription expires
 * Returns -1 for free tier (no expiry)
 */
export function getDaysUntilExpiry(endDate: Date | null | undefined): number {
    if (!endDate) return -1;

    const end = endDate instanceof Date ? endDate : new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

/**
 * Calculate days until next monthly reset based on a start date
 * This creates a rolling 30-day cycle from the subscription start date
 * 
 * Example: If user subscribed Jan 15, resets happen Feb 15, Mar 15, etc.
 */
export function getDaysUntilResetFromStartDate(startDate: Date): number {
    const now = new Date();
    const start = startDate instanceof Date ? startDate : new Date(startDate);

    // Calculate days since subscription start
    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Days into current 30-day cycle
    const daysIntoCycle = daysSinceStart % 30;

    // Days until next reset
    return 30 - daysIntoCycle;
}

/**
 * Check if usage should be reset based on subscription start date
 * For paid users: resets every 30 days from subscription start
 * For free users: resets every 30 days from last reset date
 */
export function shouldResetUsageForPaidUser(subscriptionStartDate: Date, lastResetDate: Date): boolean {
    const now = new Date();
    const start = subscriptionStartDate instanceof Date ? subscriptionStartDate : new Date(subscriptionStartDate);
    const lastReset = lastResetDate instanceof Date ? lastResetDate : new Date(lastResetDate);

    // Calculate total complete 30-day cycles since subscription start
    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const currentCycle = Math.floor(daysSinceStart / 30);

    // Calculate which cycle the last reset was in
    const daysSinceStartAtLastReset = Math.floor((lastReset.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const lastResetCycle = Math.floor(daysSinceStartAtLastReset / 30);

    // Reset if we're in a new cycle
    return currentCycle > lastResetCycle;
}

/**
 * Get the effective tier for a user, checking for expiration
 * If paid subscription expired, returns 'free'
 */
export function getEffectiveTier(tier: PlanType, subscription: UserSubscription | null | undefined): PlanType {
    if (tier === "free") return "free";
    if (isSubscriptionExpired(subscription)) return "free";
    return tier;
}


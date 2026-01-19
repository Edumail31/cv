"use client";

import Link from "next/link";
import { Crown, Building2, MessageSquare, BarChart3, Sparkles, ArrowRight } from "lucide-react";

type FeatureType = "company" | "interview" | "compare" | "premium";

interface FeatureBannerProps {
    feature: FeatureType;
    userTier?: "free" | "pro" | "premium";
}

const featureConfig = {
    company: {
        icon: Building2,
        title: "Check Job Fit Score",
        description: "Discover how well your resume matches top companies like Google, Microsoft, Amazon & more",
        buttonText: "Get Job Fit Score",
        link: "/company",
        gradient: "linear-gradient(135deg, #fef3c7, #dbeafe)",
        iconColor: "#3b82f6",
        titleColor: "#1e40af",
        descColor: "#3b82f6",
        buttonGradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)"
    },
    interview: {
        icon: MessageSquare,
        title: "Get Interview Questions from Resume",
        description: "Get 50+ AI-generated interview questions tailored to YOUR resume and target role",
        buttonText: "Generate Questions",
        link: "/interview",
        gradient: "linear-gradient(135deg, #fef3c7, #fde68a)",
        iconColor: "#d97706",
        titleColor: "#92400e",
        descColor: "#a16207",
        buttonGradient: "linear-gradient(135deg, #f59e0b, #d97706)"
    },
    compare: {
        icon: BarChart3,
        title: "Compare Resume Scores",
        description: "See how your ATS score stacks up against competitors with detailed side-by-side analysis",
        buttonText: "Compare Scores",
        link: "/compare",
        gradient: "linear-gradient(135deg, #f3e8ff, #dbeafe)",
        iconColor: "#8b5cf6",
        titleColor: "#6b21a8",
        descColor: "#7c3aed",
        buttonGradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)"
    },
    premium: {
        icon: Crown,
        title: "Unlock Premium Analysis",
        description: "Get 50+ AI parameters, market insights, and web-sourced data",
        buttonText: "Upgrade Now",
        link: "/pricing",
        gradient: "linear-gradient(135deg, #fef3c7, #fde68a)",
        iconColor: "#d97706",
        titleColor: "#92400e",
        descColor: "#a16207",
        buttonGradient: "linear-gradient(135deg, #f59e0b, #d97706)"
    }
};

export default function FeatureBanner({ feature, userTier = "free" }: FeatureBannerProps) {
    const config = featureConfig[feature];
    const IconComponent = config.icon;

    // Only show for free users on premium features
    if (userTier !== "free" && feature === "premium") {
        return null;
    }

    return (
        <div style={{
            background: config.gradient,
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "280px" }}>
                <IconComponent size={32} style={{ color: config.iconColor }} />
                <div>
                    <h3 style={{ fontWeight: 600, color: config.titleColor, marginBottom: "4px" }}>
                        {config.title}
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: config.descColor }}>
                        {config.description}
                    </p>
                </div>
            </div>
            <Link href={config.link} style={{
                background: config.buttonGradient,
                color: "#fff",
                padding: "12px 24px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
                {feature === "premium" ? <Sparkles size={18} /> : <ArrowRight size={18} />}
                {config.buttonText}
            </Link>
        </div>
    );
}

// Export config for use in other places
export { featureConfig };

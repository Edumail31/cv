"use client";

import { useEffect, useState, useRef, ReactNode } from "react";

interface LazySectionProps {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    threshold?: number;
    delay?: number;
    animation?: "fade" | "slide-up" | "slide-left" | "scale" | "none";
    placeholder?: ReactNode;
}

export default function LazySection({
    children,
    className,
    style,
    threshold = 0.1,
    delay = 0,
    animation = "fade",
    placeholder
}: LazySectionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setTimeout(() => {
                        setIsVisible(true);
                        setHasAnimated(true);
                    }, delay);
                }
            },
            { threshold, rootMargin: "50px" }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [threshold, delay, hasAnimated]);

    const getAnimationStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        };

        if (!isVisible) {
            switch (animation) {
                case "fade":
                    return { ...baseStyle, opacity: 0 };
                case "slide-up":
                    return { ...baseStyle, opacity: 0, transform: "translateY(30px)" };
                case "slide-left":
                    return { ...baseStyle, opacity: 0, transform: "translateX(-30px)" };
                case "scale":
                    return { ...baseStyle, opacity: 0, transform: "scale(0.95)" };
                case "none":
                    return {};
            }
        }

        return { ...baseStyle, opacity: 1, transform: "translateY(0) translateX(0) scale(1)" };
    };

    // Show placeholder while loading
    if (!isVisible && placeholder) {
        return (
            <div ref={sectionRef} className={className} style={{ ...style, ...getAnimationStyle() }}>
                {placeholder}
            </div>
        );
    }

    return (
        <div
            ref={sectionRef}
            className={className}
            style={{ ...style, ...getAnimationStyle() }}
        >
            {children}
        </div>
    );
}

// Skeleton loader for sections
export function SectionSkeleton({ height = "200px", lines = 3 }: { height?: string; lines?: number }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: "16px",
            padding: "24px",
            minHeight: height,
            animation: "pulse 1.5s ease-in-out infinite"
        }}>
            <div style={{
                width: "40%",
                height: "20px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                marginBottom: "16px"
            }} />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} style={{
                    width: `${100 - i * 15}%`,
                    height: "14px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "4px",
                    marginBottom: "12px"
                }} />
            ))}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

// Card skeleton
export function CardSkeleton() {
    return (
        <div style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: "16px",
            padding: "20px",
            animation: "pulse 1.5s ease-in-out infinite"
        }}>
            <div style={{
                width: "48px",
                height: "48px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "12px",
                marginBottom: "16px"
            }} />
            <div style={{
                width: "60%",
                height: "16px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                marginBottom: "8px"
            }} />
            <div style={{
                width: "80%",
                height: "12px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "4px"
            }} />
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

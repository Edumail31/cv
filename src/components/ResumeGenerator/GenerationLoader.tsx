
"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Circle, FileText, Sparkles } from "lucide-react";

interface GenerationLoaderProps {
    currentStep: "normalizing" | "rewriting" | "optimizing" | "complete";
}

export function GenerationLoader({ currentStep }: GenerationLoaderProps) {
    const steps = [
        { id: "normalizing", label: "Analyzing Structure & Normalizing Data" },
        { id: "rewriting", label: "AI Rewriting for Impact & Clarity" },
        { id: "optimizing", label: "Optimizing for ATS Keywords" },
    ];

    const getCurrentStepIndex = () => {
        if (currentStep === "complete") return 3;
        return steps.findIndex(s => s.id === currentStep);
    };

    const activeIndex = getCurrentStepIndex();

    return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
            {/* Main Icon Animation */}
            <div style={{
                position: 'relative',
                width: '80px',
                height: '80px',
                margin: '0 auto 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'conic-gradient(from 0deg, transparent 0%, #6366f1 50%, #ec4899 100%)',
                        maskImage: 'radial-gradient(transparent 60%, black 61%)',
                        WebkitMaskImage: 'radial-gradient(transparent 60%, black 61%)',
                    }}
                />

                <div style={{
                    position: 'relative',
                    background: '#1a1a24',
                    borderRadius: '50%',
                    width: '70px',
                    height: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                }}>
                    {currentStep === "complete" ? (
                        <CheckCircle2 size={32} color="#22c55e" />
                    ) : (
                        <FileText size={32} color="white" style={{ opacity: 0.8 }} />
                    )}
                </div>

                {/* Floating sparkles */}
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [-10, -20, -10],
                            opacity: [0, 1, 0],
                            scale: [0.5, 1, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: "easeInOut",
                        }}
                        style={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            color: '#fbbf24',
                        }}
                    >
                        <Sparkles size={16} />
                    </motion.div>
                ))}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {currentStep === "complete" ? "Resume Generated!" : "Crafting Your Resume..."}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '32px' }}>
                Applying best practices for {currentStep === "complete" ? "export" : "your specific role"}
            </p>

            {/* Steps Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '320px', margin: '0 auto' }}>
                {steps.map((step, index) => {
                    const isCompleted = index < activeIndex;
                    const isActive = index === activeIndex;

                    return (
                        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Icon */}
                            <div style={{
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {isCompleted ? (
                                    <CheckCircle2 size={20} color="#22c55e" />
                                ) : isActive ? (
                                    <Loader2 size={20} color="#6366f1" style={{ animation: 'spin 2s linear infinite' }} />
                                ) : (
                                    <Circle size={20} color="rgba(255,255,255,0.2)" />
                                )}
                            </div>

                            {/* Text */}
                            <span style={{
                                fontSize: '0.9rem',
                                color: isActive || isCompleted ? '#fff' : 'rgba(255,255,255,0.4)',
                                fontWeight: isActive ? 500 : 400,
                                transition: 'color 0.3s',
                            }}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
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

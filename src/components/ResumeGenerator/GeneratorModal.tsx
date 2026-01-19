
"use client";

import { useState } from "react";
import { TargetProfile } from "@/lib/types/resume-generator";
import { Wand2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (role: string, profile: TargetProfile) => void;
}

export function GeneratorModal({ isOpen, onClose, onGenerate }: GeneratorModalProps) {
    const [role, setRole] = useState("");
    const [profile, setProfile] = useState<TargetProfile>("Job Change");

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                    }}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '500px',
                        background: '#1a1a24', // Use theme var if possible
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={20} />
                    </button>

                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            display: 'inline-flex',
                            padding: '12px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            borderRadius: '16px',
                            marginBottom: '16px',
                            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
                        }}>
                            <Wand2 size={24} color="white" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                            Generate ATS Resume
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
                            Create a role-optimized, ATS-friendly resume in seconds.
                        </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                            Target Role
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Senior Software Engineer"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <button
                        onClick={() => onGenerate(role, profile)}
                        disabled={!role.trim()}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: role.trim() ? 'pointer' : 'not-allowed',
                            opacity: role.trim() ? 1 : 0.5,
                            boxShadow: '0 8px 20px -6px rgba(99, 102, 241, 0.5)',
                        }}
                    >
                        Generate Resume
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

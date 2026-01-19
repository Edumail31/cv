"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles, FileText, CheckCircle, ArrowRight, Zap,
  Download, Wand2, Star, LayoutDashboard, LogOut,
  Shield, TrendingUp, Target
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  siGoogle, siMeta, siApple, siNetflix, siTesla, siUber,
  siAirbnb, siIntel, siNvidia, siSamsung, siSpotify,
  siFacebook, siInstagram, siX, siYoutube, siGithub, siSwiggy
} from 'simple-icons';

// Fade In Component
const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`
      }}
    >
      {children}
    </div>
  );
};

// Infinite Marquee Component
const Marquee = ({ items, speed = 40, direction = "left" }: { items: React.ReactNode[], speed?: number, direction?: "left" | "right" }) => {
  return (
    <div style={{
      overflow: 'hidden',
      width: '100%',
      position: 'relative',
      maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
    }}>
      <div
        className={`flex gap-12 w-max animate-scroll-${direction}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {items}
        {items}
      </div>
    </div>
  );
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };



  return (
    <>
      {/* Navigation */}
      <nav className="fixed w-full z-50" style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <div style={{ background: 'var(--gradient-primary)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
              <FileText size={20} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem' }}>
              Resume<span className="text-gradient">Score</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-secondary">Features</Link>
            <Link href="#pricing" className="text-secondary">Pricing</Link>

            {!loading && (
              user ? (
                <>
                  <Link href="/dashboard" className="btn btn-secondary flex items-center gap-2">
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: 'var(--space-2)' }}>
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-secondary">Login</Link>
                  <Link href="/signup" className="btn btn-primary">
                    Start Free
                    <ArrowRight size={16} />
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative" style={{ minHeight: 'auto', paddingTop: '100px', paddingBottom: '40px' }}>
        <div className="absolute" style={{
          top: 0, left: 0, right: 0, height: '100%',
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent)',
          pointerEvents: 'none',
        }} />

        <div className="container relative">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)', alignItems: 'center' }}>
            <div>
              <FadeIn>
                <h1 style={{
                  fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  marginBottom: 'var(--space-4)',
                }}>
                  Check Your Resume Score
                  <br />
                  <span className="text-gradient">Before</span> You Apply.
                </h1>

                <p className="text-secondary text-lg" style={{ marginBottom: 'var(--space-4)', maxWidth: '500px' }}>
                  ATS resume scoring, job fit analysis, and interview questions — all from your resume.
                </p>

                <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-6)' }}>
                  <Link href={user ? "/dashboard" : "/signup"} className="btn btn-primary btn-lg">
                    <Zap size={20} />
                    {user ? "Go to Dashboard" : "Check Your Resume Score"}
                    {!user && <ArrowRight size={16} />}
                  </Link>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: 'var(--success-400)' }} />
                    <span className="text-sm text-secondary">No credit card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: 'var(--success-400)' }} />
                    <span className="text-sm text-secondary">Free analysis</span>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Hero Visual - AI Dashboard Preview */}
            <div style={{ position: 'relative' }}>
              <FadeIn delay={0.2}>
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  transform: 'rotate(-2deg)',
                  border: '1px solid var(--border-color)'
                }}>
                  {/* Mock UI Header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
                    <div>
                      <h3 className="font-bold text-lg">AI Resume Score</h3>
                      <p className="text-sm text-secondary">Real-time analysis</p>
                    </div>
                    <div className="badge bg-success-500/10 text-success-400 border-success-500/20">
                      <CheckCircle size={14} />
                      94/100
                    </div>
                  </div>

                  {/* Mock Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-primary-500/10 rounded-lg">
                      <div className="text-xs text-primary-400 font-semibold mb-1">IMPACT</div>
                      <div className="text-xl font-bold">High</div>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <div className="text-xs text-purple-400 font-semibold mb-1">ATS READY</div>
                      <div className="text-xl font-bold">Yes</div>
                    </div>
                  </div>

                  {/* Mock Recommendations */}
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start p-3 bg-bg-tertiary rounded-lg border border-border">
                      <Sparkles size={16} className="text-warning-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold mb-1">Suggestion</div>
                        <div className="text-xs text-secondary">Add metrics to your experience at Google to increase impact by 25%.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start p-3 bg-bg-tertiary rounded-lg border border-border">
                      <Target size={16} className="text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold mb-1">Keywords</div>
                        <div className="text-xs text-secondary">Missing key terms: "System Design", "Scalability".</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="animate-float" style={{
                  position: 'absolute',
                  bottom: '40px',
                  left: '-20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 16px',
                  maxWidth: '220px',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} style={{ color: 'var(--primary-400)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>AI Optimized</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                    "Recruiters are 3x more likely to shortlist this profile" 🚀
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12" style={{ background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div className="container relative z-10">
          <FadeIn>
            <div className="text-center mb-8">
              <p className="text-secondary text-sm font-semibold tracking-wider uppercase mb-2">
                Trusted by Professionals from Top Companies
              </p>
            </div>

            {/* Companies Marquee */}
            <Marquee speed={40} direction="left" items={[
              { icon: siGoogle, name: "Google" },
              { icon: siMeta, name: "Meta" },
              { icon: siApple, name: "Apple" },
              { icon: siNetflix, name: "Netflix" },
              { icon: siTesla, name: "Tesla" },
              { icon: siUber, name: "Uber" },
              { icon: siAirbnb, name: "Airbnb" },
              { icon: siIntel, name: "Intel" },
              { icon: siNvidia, name: "Nvidia" },
              { icon: siSamsung, name: "Samsung" },
              { icon: siSpotify, name: "Spotify" },
              { icon: siSwiggy, name: "Swiggy" },
              { icon: siFacebook, name: "Facebook" },
              { icon: siInstagram, name: "Instagram" },
              { icon: siX, name: "X" },
              { icon: siYoutube, name: "YouTube" },
              { icon: siGithub, name: "GitHub" }
            ].map((company, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8, transition: 'opacity 0.2s' }} className="hover:opacity-100">
                <div style={{
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg
                    role="img"
                    viewBox="0 0 24 24"
                    fill={`#${company.icon.hex}`}
                    width="100%"
                    height="100%"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d={company.icon.path} />
                  </svg>
                </div>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap'
                }}>
                  {company.name}
                </span>
              </div>
            ))} />

          </FadeIn>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="badge mb-4">
                <Sparkles size={14} />
                Power Features
              </span>
              <h2 className="heading-lg mb-4">One Resume. Many Hiring Outcomes.</h2>
              <p className="text-secondary max-w-2xl mx-auto">
                ATS resume scoring, job fit analysis, and interview questions — all from your resume.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Wand2 size={24} />,
                title: "Resume Bullet Improvement",
                description: "Rewrite resume bullets to increase ATS score and recruiter impact.",
              },
              {
                icon: <CheckCircle size={24} />,
                title: "ATS Resume Score",
                description: "Instantly see how your resume performs in applicant tracking systems.",
              },
              {
                icon: <TrendingUp size={24} />,
                title: "Job Market Fit",
                description: "Compare your resume against real job requirements and hiring trends.",
              },
              {
                icon: <Target size={24} />,
                title: "ATS Keywords Match",
                description: "Find missing keywords recruiters and ATS systems look for.",
              },
              {
                icon: <FileText size={24} />,
                title: "ATS-Safe Formatting",
                description: "Formatting that passes ATS parsing without breaking layout.",
              },
              {
                icon: <Download size={24} />,
                title: "Application-Ready Export",
                description: "Download resumes in ATS-friendly formats ready to submit.",
              },
            ].map((feature, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="card h-full" style={{ padding: 'var(--space-6)' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                    color: 'white',
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                    {feature.title}
                  </h3>
                  <p className="text-secondary text-sm">{feature.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="badge mb-4">
                <Shield size={14} />
                Simple Pricing
              </span>
              <h2 className="heading-lg mb-4">Start For Free, Upgrade For Power</h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-4" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Free Plan */}
            <FadeIn delay={0.1}>
              <div className="card" style={{ padding: 'var(--space-6)', height: '100%' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>Free</h3>
                <p className="text-secondary text-sm mb-3">Get started</p>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                  ₹0
                  <span className="text-secondary text-sm" style={{ fontWeight: 400 }}>/forever</span>
                </div>

                <ul style={{ listStyle: 'none', marginBottom: 'var(--space-4)' }}>
                  {[
                    "3 ATS Resume Scores/month",
                    "1 Resume Comparison/month",
                    "1 ATS Resume Export (Watermarked)",
                    "Basic ATS Analysis",
                    "Profile Extraction",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 mb-2 text-sm">
                      <CheckCircle size={14} style={{ color: 'var(--success-400)', flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="btn btn-secondary w-full">
                  Start Free
                </Link>
              </div>
            </FadeIn>

            {/* Pro Plan */}
            <FadeIn delay={0.2}>
              <div className="card" style={{
                padding: 'var(--space-6)',
                border: '2px solid var(--primary-500)',
                position: 'relative',
                transform: 'scale(1.02)',
                height: '100%',
                background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  padding: '4px 16px',
                  borderRadius: '100px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  ⭐ Best Value
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>Pro</h3>
                <p className="text-secondary text-sm mb-3">For active job seekers</p>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--success-400)' }}>
                  ₹99
                  <span className="text-secondary text-sm" style={{ fontWeight: 400 }}>/year</span>
                </div>

                <ul style={{ listStyle: 'none', marginBottom: 'var(--space-4)' }}>
                  {[
                    "20 ATS Resume Scores/month",
                    "5 Resume Comparisons/month",
                    "5 Interview Questions/month",
                    "5 Job Fit Score Checks/month",
                    "Advanced AI Pro-Tips",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 mb-2 text-sm">
                      <CheckCircle size={14} style={{ color: 'var(--success-400)', flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href={user ? "/pricing" : "/signup"} className="btn btn-primary w-full">
                  Get Pro
                </Link>
              </div>
            </FadeIn>

            {/* Premium Plan */}
            <FadeIn delay={0.3}>
              <div className="card" style={{ padding: 'var(--space-6)', height: '100%' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>Premium</h3>
                <p className="text-secondary text-sm mb-3">Unlimited power</p>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--warning-400)' }}>
                  ₹299
                  <span className="text-secondary text-sm" style={{ fontWeight: 400 }}>/year</span>
                </div>

                <ul style={{ listStyle: 'none', marginBottom: 'var(--space-4)' }}>
                  {[
                    "Unlimited ATS Resume Scores",
                    "20 Resume Comparisons/month",
                    "10 Interview Questions/month",
                    "20 Job Fit Score Checks/month",
                    "3 Resume Exports (PDF+DOCX)",
                    "5 ATS Resume Generations/month",
                    "Expected Answers & Follow-ups",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 mb-2 text-sm">
                      <CheckCircle size={14} style={{ color: 'var(--success-400)', flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href={user ? "/pricing" : "/signup"} className="btn btn-secondary w-full">
                  Go Premium
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container text-center">
          <FadeIn>
            <h2 className="heading-lg mb-4">Ready to Check Your Resume Score?</h2>
            <p className="text-secondary mb-8" style={{ maxWidth: '550px', margin: '0 auto var(--space-8)' }}>
              See how your resume performs for ATS, jobs, and interviews — before you apply.
            </p>
            <Link href={user ? "/dashboard" : "/signup"} className="btn btn-primary btn-lg">
              <Zap size={20} />
              {user ? "Go to Dashboard" : "Get Resume Score Free"}
              {!user && <ArrowRight size={16} />}
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: 'var(--space-8) 0', background: 'var(--bg-secondary)' }}>
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ background: 'var(--gradient-primary)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              <FileText size={16} color="white" />
            </div>
            <span style={{ fontWeight: 600 }}>ResumeScore — ATS Resume Scoring & Job Matching</span>
          </div>
          <p className="text-secondary text-sm">© 2026 ResumeScore.app. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

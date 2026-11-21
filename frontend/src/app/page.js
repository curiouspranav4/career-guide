'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  FileSearch,
  Sparkles,
  Mic,
  FileText,
  Zap,
  Building2,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Crown,
  Check,
  Code2,
  Layers,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DEMO_ROLES = [
  {
    id: 'fullstack',
    label: 'Full-Stack',
    title: 'Full-Stack Engineer',
    company: 'TechNova Labs • Bengaluru',
    salary: '14 LPA',
    match: 92,
    matchedCount: '11 / 12',
    skills: ['React', 'Next.js', 'Node.js', 'MongoDB', 'Tailwind'],
    gap: 'Docker',
    interviewScore: 88,
    autoApply: 'Eligible',
  },
  {
    id: 'data',
    label: 'Data Analyst',
    title: 'Data & BI Analyst',
    company: 'FinEdge Corp • Remote',
    salary: '10 LPA',
    match: 85,
    matchedCount: '9 / 11',
    skills: ['Python', 'SQL', 'Power BI', 'Excel', 'Pandas'],
    gap: 'Tableau',
    interviewScore: 82,
    autoApply: 'Eligible',
  },
  {
    id: 'backend',
    label: 'Backend',
    title: 'Node.js Backend Dev',
    company: 'CloudScale • Pune',
    salary: '12 LPA',
    match: 78,
    matchedCount: '8 / 10',
    skills: ['Node.js', 'Express', 'MongoDB', 'REST API', 'Redis'],
    gap: 'Kubernetes',
    interviewScore: 79,
    autoApply: 'Eligible',
  },
];

export default function HomePage() {
  const { user, isRecruiter, isAdmin } = useAuth();
  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const activeRole = DEMO_ROLES[activeRoleIdx];

  const dashboardHref = isAdmin
    ? '/admin'
    : isRecruiter
    ? '/recruiter'
    : '/dashboard';

  return (
    <div className="min-h-screen bg-[#0D0D10] text-white selection:bg-coral-600 selection:text-white">
      {/* Top Frosted Navbar */}
      <header className="sticky top-0 z-50 bg-[#0D0D10]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 text-white flex items-center justify-center shadow-lg shadow-coral-600/30 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-display font-semibold text-xl tracking-tight text-white">
              CareerGuide<span className="text-coral-500">.ai</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#roles" className="hover:text-white transition-colors">
              Recruiters
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white text-sm font-semibold hover:from-coral-600 hover:to-coral-700 transition-all shadow-lg shadow-coral-600/25"
              >
                Open Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white text-sm font-semibold hover:from-coral-600 hover:to-coral-700 transition-all shadow-lg shadow-coral-600/30"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Architectural Grid + Spotlight */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Subtle Grid Overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Ambient Spotlights */}
        <div className="pointer-events-none absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-coral-600/20 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-tealbrand-600/20 blur-[140px]" />

        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] border border-white/15 backdrop-blur-md text-xs font-semibold text-coral-200 mb-6">
                <span className="w-2 h-2 rounded-full bg-tealbrand-600 animate-pulse" />
                AI Resume Intelligence • Voice Mock Interviews • Auto-Apply
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[58px] font-semibold leading-[1.05] tracking-tight text-white mb-6">
                Your unfair advantage in{' '}
                <span className="bg-gradient-to-r from-coral-500 via-amber-400 to-tealbrand-600 bg-clip-text text-transparent">
                  landing offers.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-stone-300 leading-relaxed max-w-xl mb-8">
                Stop guessing why applications get ignored. Match your resume
                against real roles, practice voice + live-code AI interviews,
                build standout CVs, and automate applications 24/7.
              </p>

              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  href={user ? dashboardHref : '/register'}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white font-semibold text-sm hover:from-coral-600 hover:to-coral-700 transition-all shadow-xl shadow-coral-600/30 hover:-translate-y-0.5"
                >
                  {user ? 'Go to Dashboard' : 'Start Free — 50 Credits'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.07] text-white font-semibold text-sm border border-white/15 hover:bg-white/15 transition-all"
                >
                  Sign In
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-6 mt-9 pt-7 border-t border-white/10 text-xs text-stone-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-tealbrand-600" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-tealbrand-600" />
                  Instant PDF skill parser
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-tealbrand-600" />
                  Verified recruiters only
                </span>
              </div>
            </div>

            {/* Right Interactive Live Preview Card */}
            <div className="lg:col-span-6 animate-fade-up">
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-coral-500/70 via-white/20 to-tealbrand-600/70 shadow-2xl">
                <div className="bg-[#151519]/95 backdrop-blur-xl rounded-[23px] p-6 space-y-5">
                  {/* Role Switcher Pills */}
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-coral-500" />
                      Try Live Preview
                    </span>
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                      {DEMO_ROLES.map((role, idx) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setActiveRoleIdx(idx)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            activeRoleIdx === idx
                              ? 'bg-coral-600 text-white shadow-sm'
                              : 'text-stone-400 hover:text-white'
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Role Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display font-semibold text-xl text-white">
                        {activeRole.title}
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {activeRole.company} •{' '}
                        <span className="text-stone-200 font-semibold">
                          {activeRole.salary}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-tealbrand-600/20 text-tealbrand-100 border border-tealbrand-600/40">
                        {activeRole.match}% Match
                      </span>
                    </div>
                  </div>

                  {/* Animated Match Progress */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-stone-400">
                        Resume Skill Compatibility
                      </span>
                      <span className="font-mono text-tealbrand-100 font-semibold">
                        {activeRole.matchedCount} skills
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-coral-500 to-tealbrand-600 transition-all duration-500"
                        style={{ width: `${activeRole.match}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {activeRole.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-stone-100 text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      <span className="px-2.5 py-1 rounded-lg bg-coral-600/20 border border-coral-500/35 text-coral-200 text-xs font-medium">
                        + {activeRole.gap} (Gap)
                      </span>
                    </div>
                  </div>

                  {/* Bottom Live Metrics */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-2xl bg-gradient-to-br from-coral-600/20 to-transparent border border-coral-500/30 p-4">
                      <div className="flex items-center justify-between text-coral-200 text-xs font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-coral-500" />
                          AI Mock Score
                        </span>
                        <span className="text-[10px] font-mono text-coral-200/80">
                          VOICE + CODE
                        </span>
                      </div>
                      <p className="font-mono text-2xl font-bold text-white">
                        {activeRole.interviewScore}
                        <span className="text-xs font-normal text-stone-400">
                          /100
                        </span>
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gradient-to-br from-tealbrand-600/20 to-transparent border border-tealbrand-600/30 p-4">
                      <div className="flex items-center justify-between text-tealbrand-100 text-xs font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-tealbrand-600" />
                          Auto-Apply
                        </span>
                        <span className="w-2 h-2 rounded-full bg-tealbrand-600" />
                      </div>
                      <p className="font-mono text-2xl font-bold text-white">
                        {activeRole.autoApply}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Strip */}
      <section className="bg-[#141418] border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-5 flex flex-wrap items-center justify-between gap-6 text-xs sm:text-sm font-medium text-stone-400">
          <span className="flex items-center gap-2 text-stone-200">
            <Layers className="w-4 h-4 text-coral-500" />
            12+ Industry Skill Dictionaries
          </span>
          <span className="flex items-center gap-2 text-stone-200">
            <FileText className="w-4 h-4 text-tealbrand-600" />
            11 Designer Resume Templates
          </span>
          <span className="flex items-center gap-2 text-stone-200">
            <Code2 className="w-4 h-4 text-amber-400" />
            Live Output &amp; Bug-Fix Interviews
          </span>
          <span className="flex items-center gap-2 text-stone-200">
            <Briefcase className="w-4 h-4 text-coral-500" />
            Real-Time Applicant Tracking
          </span>
        </div>
      </section>

      {/* Asymmetric Bento Features Section */}
      <section id="features" className="bg-canvas text-ink py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-coral-600 mb-2">
              All-in-One Career OS
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink tracking-tight">
              Six powerful tools working together for your next offer.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
            {/* Large Bento Card 1 */}
            <div className="md:col-span-4 bg-white rounded-3xl border border-stone-200 p-7 shadow-soft hover:shadow-lifted transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-coral-600 text-white flex items-center justify-center mb-5 shadow-sm">
                  <FileSearch className="w-5 h-5" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-ink mb-2">
                  AI Resume Skill Extraction &amp; Gap Analysis
                </h3>
                <p className="text-sm text-muted leading-relaxed max-w-xl">
                  Upload your PDF resume once. Our parser detects technical and
                  business skills, computes exact match percentages for every
                  open job, and highlights the exact missing skills to add.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-stone-100 flex flex-wrap gap-2">
                {['React • Matched', 'Node.js • Matched', 'MongoDB • Matched', 'Docker • Missing'].map(
                  (tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        tag.includes('Missing')
                          ? 'bg-coral-50 text-coral-700 border border-coral-200'
                          : 'bg-tealbrand-50 text-tealbrand-700 border border-tealbrand-100'
                      }`}
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Compact Bento Card 2 */}
            <div className="md:col-span-2 bg-ink text-white rounded-3xl p-7 shadow-lifted flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-ink flex items-center justify-center mb-5">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">
                  Voice AI Mock Interviews
                </h3>
                <p className="text-sm text-stone-300 leading-relaxed">
                  12 role-specific questions with voice Q&amp;A, code debugging,
                  and honest AI scorecards.
                </p>
              </div>
              {/* Mini Audio Waveform Visual */}
              <div className="mt-6 flex items-end gap-1.5 h-10">
                {[35, 70, 50, 95, 60, 85, 45, 75, 40, 65, 90, 50].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-gradient-to-t from-coral-600 to-amber-400"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Compact Bento Card 3 */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-stone-200 p-7 shadow-soft hover:shadow-lifted transition-all">
              <div className="w-11 h-11 rounded-xl bg-tealbrand-600 text-white flex items-center justify-center mb-5">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink mb-2">
                11 Designer CV Templates
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Switch layouts in one click, preview live in your browser, and
                export clean ATS-ready resumes.
              </p>
            </div>

            {/* Large Bento Card 4 */}
            <div className="md:col-span-4 bg-gradient-to-br from-tealbrand-800 to-ink text-white rounded-3xl p-7 shadow-lifted flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-white/15 text-tealbrand-100 flex items-center justify-center mb-5">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold mb-2">
                    Smart Auto-Apply on Autopilot
                  </h3>
                  <p className="text-sm text-stone-300 leading-relaxed max-w-lg">
                    Set your minimum skill match %, preferred cities, and target
                    LPA. Whenever a matching job is posted, CareerGuide applies
                    for you automatically.
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tealbrand-600/30 border border-tealbrand-600/50 text-tealbrand-100 text-xs font-mono font-semibold">
                  PREMIUM
                </span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-stone-400">Min Match</p>
                  <p className="font-mono font-bold text-white text-sm mt-0.5">
                    70%+
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-stone-400">Target LPA</p>
                  <p className="font-mono font-bold text-white text-sm mt-0.5">
                    8+ LPA
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-stone-400">Status</p>
                  <p className="font-mono font-bold text-tealbrand-100 text-sm mt-0.5">
                    Active 24/7
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Workflow */}
      <section
        id="workflow"
        className="bg-[#0D0D10] text-white py-20 border-y border-white/10"
      >
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-tealbrand-600 mb-2">
              Simple 3-Step Flow
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white">
              From upload to offer letter in 3 steps.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Upload or Build Your CV',
                desc: 'Upload your existing PDF for instant skill parsing or create a fresh resume from 11 templates.',
              },
              {
                step: '02',
                title: 'Match & Apply Smarter',
                desc: 'See exact match scores on every job, fix missing skills, and track recruiter status updates.',
              },
              {
                step: '03',
                title: 'Ace the Interview',
                desc: 'Practice voice + coding mock interviews tailored to your target role with detailed AI feedback.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 hover:border-coral-500/50 transition-colors"
              >
                <span className="font-mono text-xs font-bold text-coral-200 bg-coral-600/25 border border-coral-500/30 px-3 py-1 rounded-full">
                  STEP {s.step}
                </span>
                <h3 className="font-display font-semibold text-xl text-white mt-5 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-stone-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs Premium Pricing */}
      <section id="pricing" className="bg-canvas text-ink py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-coral-600 mb-2">
              Simple Pricing
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink">
              Start free. Upgrade when you want Autopilot.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-soft flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Starter
                </p>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="font-display text-4xl font-bold text-ink">
                    ₹0
                  </span>
                  <span className="text-sm text-muted">/ forever</span>
                </div>
                <p className="text-sm text-muted mb-6">
                  Everything you need to analyze your resume and start applying.
                </p>
                <ul className="space-y-3 text-sm text-ink mb-8">
                  {[
                    '50 monthly credits included',
                    'AI Resume PDF skill extraction',
                    'Job match percentage on all listings',
                    'Daily AI Voice Mock Interviews',
                    'Access to classic CV templates',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-tealbrand-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sand text-ink font-semibold text-sm hover:bg-stone-200 transition-colors"
              >
                Create Free Account
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-ink text-white rounded-3xl border-2 border-coral-600 p-8 shadow-lifted flex flex-col justify-between relative">
              <span className="absolute -top-3.5 right-6 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-coral-600 text-white text-xs font-bold shadow-md">
                <Crown className="w-3.5 h-3.5" />
                MOST POPULAR
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-coral-200">
                  Premium
                </p>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="font-display text-4xl font-bold text-white">
                    ₹199
                  </span>
                  <span className="text-sm text-stone-400">/ one-time</span>
                </div>
                <p className="text-sm text-stone-300 mb-6">
                  Unlock Auto-Apply, executive CV templates, and unlimited prep.
                </p>
                <ul className="space-y-3 text-sm text-stone-100 mb-8">
                  {[
                    'Smart Auto-Apply with City & LPA filters',
                    'All 11 Classic + Executive CV templates',
                    'Unlimited AI Voice Mock Interviews',
                    'Priority skill-gap insights',
                    'Instant activation via Razorpay',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-coral-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 text-white font-semibold text-sm hover:from-coral-600 hover:to-coral-700 transition-all shadow-lg shadow-coral-600/30"
              >
                Get Started &amp; Upgrade
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recruiter Banner + Footer */}
      <section id="roles" className="bg-[#0D0D10] text-white py-16 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5">
          <div className="rounded-3xl bg-gradient-to-r from-coral-600 via-coral-500 to-amber-500 p-8 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-ink/20 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold">
                  Hiring for your team?
                </h3>
                <p className="text-white/90 text-sm sm:text-base mt-1 max-w-xl">
                  Post roles with structured LPA &amp; skills, view instant
                  candidate match scores, and manage applicants in one place.
                </p>
              </div>
            </div>
            <Link
              href="/register?role=recruiter"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-ink text-white font-semibold text-sm hover:bg-stone-800 transition-colors shadow-lg"
            >
              Register as Recruiter
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0D0D10] py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-2 font-display font-semibold text-sm text-white">
            <Compass className="w-4 h-4 text-coral-500" />
            CareerGuide.ai
          </div>
          <p>&copy; {new Date().getFullYear()} CareerGuide AI. Built with Next.js, Express &amp; MongoDB.</p>
        </div>
      </footer>
    </div>
  );
}
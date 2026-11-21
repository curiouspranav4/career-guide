'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Compass,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
  Building2,
  Globe,
  FileBadge,
  BadgeCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { register as registerApi, clearApiCache } from '@/lib/api';

const ROLES = [
  {
    id: 'job_seeker_fresher',
    title: 'Fresher',
    desc: 'Student or recent graduate',
    icon: GraduationCap,
  },
  {
    id: 'job_seeker_experienced',
    title: 'Experienced',
    desc: 'Working professional',
    icon: Briefcase,
  },
  {
    id: 'recruiter',
    title: 'Recruiter',
    desc: 'Hiring for a company',
    icon: Building2,
  },
];

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function RegisterFormContent() {
  const searchParams = useSearchParams();

  const [role, setRole] = useState('job_seeker_fresher');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Recruiter fields
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [designation, setDesignation] = useState('');
  const [gstin, setGstin] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-select role from URL query (?role=recruiter etc.)
  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (
      paramRole === 'recruiter' ||
      paramRole === 'job_seeker_fresher' ||
      paramRole === 'job_seeker_experienced'
    ) {
      setRole(paramRole);
    }
  }, [searchParams]);

  const isRecruiter = role === 'recruiter';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || password.length < 6) {
      const msg = 'Please fill all fields (password must be at least 6 characters).';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (isRecruiter && !companyName.trim()) {
      const msg = 'Company name is required for recruiter accounts.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const cleanGstin = gstin.trim().toUpperCase();
    if (isRecruiter && cleanGstin && !GSTIN_REGEX.test(cleanGstin)) {
      const msg = 'Invalid GSTIN format (15-character alphanumeric code).';
      setError(msg);
      toast.error(msg);
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    };

    if (isRecruiter) {
      payload.companyName = companyName.trim();
      payload.companyWebsite = companyWebsite.trim();
      payload.designation = designation.trim();
      payload.gstin = cleanGstin;
    }

    setSubmitting(true);
    try {
      const { data } = await registerApi(payload);
      clearApiCache();

      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      toast.success(
        isRecruiter
          ? 'Recruiter account created! Redirecting to Recruiter Hub...'
          : 'Account created! 50 free credits added.'
      );

      window.location.href = isRecruiter ? '/recruiter' : '/dashboard';
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Registration failed. Please check your details and try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row">
      {/* Left Editorial Dark Panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#141418] text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-coral-600/20 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-tealbrand-600/20 blur-[110px]" />

        <Link href="/" className="relative z-10 flex items-center gap-2.5 w-fit">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 text-white flex items-center justify-center shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">
            CareerGuide<span className="text-coral-500">.ai</span>
          </span>
        </Link>

        <div className="relative z-10 space-y-5 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-coral-200">
            <Sparkles className="w-3.5 h-3.5 text-coral-500" />
            {isRecruiter ? 'Verified Hiring Workspace' : '50 Free Credits Included'}
          </span>

          <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.12] tracking-tight">
            {isRecruiter ? (
              <>
                Hire pre-scored talent with{' '}
                <span className="italic text-coral-500">AI matching.</span>
              </>
            ) : (
              <>
                Build a sharper career with{' '}
                <span className="italic text-coral-500">real AI</span>{' '}
                guidance.
              </>
            )}
          </h1>

          <p className="text-sm text-stone-300 leading-relaxed">
            {isRecruiter
              ? 'Publish structured openings with LPA & skills, see instant candidate match percentages, inspect PDF resumes, and manage every hiring stage.'
              : 'Get instant resume skill analysis, 11 designer CV templates, voice mock interviews, and automated job applications.'}
          </p>
        </div>

        <div className="relative z-10 space-y-2.5 text-xs text-stone-300">
          {(isRecruiter
            ? [
                'Instant skill-match scoring on every applicant',
                'Direct PDF resume inspection & status pipeline',
                'GSTIN-verified employer trust badge',
              ]
            : [
                'Free 50 monthly credits for job seekers',
                'ATS skill extraction across 12+ industries',
                'Voice + Live-Code AI Mock Interview studio',
              ]
          ).map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-tealbrand-600 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 py-8 lg:py-10 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink mb-5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-lifted p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
                Create your account
              </h2>
              <p className="text-sm text-muted mt-1">
                Choose your role to personalize your workspace.
              </p>
            </div>

            {/* Role Selector */}
            <div className="grid grid-cols-3 gap-2.5">
              {ROLES.map((item) => {
                const Icon = item.icon;
                const active = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRole(item.id);
                      setError('');
                    }}
                    className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all ${
                      active
                        ? 'bg-coral-50/70 border-coral-600 ring-1 ring-coral-600'
                        : 'bg-canvas border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-2 ${
                        active ? 'text-coral-600' : 'text-muted'
                      }`}
                    />
                    <p
                      className={`text-xs sm:text-sm font-bold ${
                        active ? 'text-coral-700' : 'text-ink'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-medium text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Extra Recruiter Company Details */}
              {isRecruiter && (
                <div className="pt-2 border-t border-stone-100 space-y-3.5">
                  <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-coral-600" />
                    Company Verification Details
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required={isRecruiter}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Tech Pvt Ltd"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        Your Designation
                      </label>
                      <div className="relative">
                        <BadgeCheck className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g. HR Manager"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        Company Website
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                          placeholder="https://company.com"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        GSTIN (Optional)
                      </label>
                      <div className="relative">
                        <FileBadge className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          maxLength={15}
                          value={gstin}
                          onChange={(e) =>
                            setGstin(e.target.value.toUpperCase())
                          }
                          placeholder="22AAAAA0000A1Z5"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm font-mono uppercase text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-coral-600 hover:bg-coral-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {submitting
                  ? 'Creating account...'
                  : isRecruiter
                  ? 'Register as Recruiter'
                  : 'Create Free Account'}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="text-center text-xs text-muted pt-1">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-coral-600 hover:text-coral-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center text-sm text-muted">
          Loading registration...
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
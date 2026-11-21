'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { login as loginApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/UI';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect if already signed in
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'recruiter') router.replace('/recruiter');
      else router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await loginApi({
        email: email.trim().toLowerCase(),
        password,
      });

      const rawUser = data.user || data;
      const normalizedUser = {
        id: rawUser._id || rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: rawUser.role,
        plan: rawUser.plan || 'free',
        credits: rawUser.credits ?? 50,
        companyName: rawUser.companyName,
        recruiterStatus: rawUser.recruiterStatus,
      };

      login(normalizedUser, data.token);
      toast.success(`Welcome back, ${normalizedUser.name}!`);

      if (normalizedUser.role === 'admin') {
        router.push('/admin');
      } else if (normalizedUser.role === 'recruiter') {
        router.push('/recruiter');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Invalid email or password. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-canvas">
      {/* Left High-Contrast Editorial Brand Panel */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#0D0D10] text-white relative overflow-hidden p-12 flex-col justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-coral-600/25 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-tealbrand-600/25 blur-[110px]" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 text-white flex items-center justify-center shadow-lg shadow-coral-600/30">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-display font-semibold text-2xl tracking-tight">
              CareerGuide<span className="text-coral-500">.ai</span>
            </span>
          </Link>

          <div className="mt-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-coral-200 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-coral-500" />
              Welcome back to your workspace
            </div>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Pick up right where your{' '}
              <span className="text-coral-500 italic">career search</span> left
              off.
            </h2>
            <p className="text-sm text-stone-300 leading-relaxed mt-4 max-w-sm">
              Track your live applications, inspect updated match scores, and
              continue your AI voice interview practice.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-3 pt-8 border-t border-white/10 text-sm text-stone-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-tealbrand-600 shrink-0" />
            <span>Instant AI resume skill match on every job</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-tealbrand-600 shrink-0" />
            <span>Voice &amp; live-code mock interview feedback</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-tealbrand-600 shrink-0" />
            <span>Dedicated dashboards for seekers, recruiters &amp; admins</span>
          </div>
        </div>
      </div>

      {/* Right Sign-In Form */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>

          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-coral-600 text-white flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-display font-semibold text-xl text-ink">
              CareerGuide<span className="text-coral-600">.ai</span>
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-lifted p-7 sm:p-9">
            <div className="mb-7">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
                Sign in to your account
              </h1>
              <p className="text-sm text-muted mt-1.5">
                Enter your email and password to access your workspace.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100 transition-all"
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

              <Button
                type="submit"
                loading={submitting}
                size="lg"
                className="w-full mt-2"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-stone-100 text-center text-sm text-muted">
              Don&apos;t have an account yet?{' '}
              <Link
                href="/register"
                className="font-semibold text-coral-600 hover:text-coral-700"
              >
                Create free account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
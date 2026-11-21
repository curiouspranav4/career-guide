'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  LayoutDashboard,
  Briefcase,
  Building2,
  FileSearch,
  FileText,
  Mic,
  Bookmark,
  Send,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Crown,
  Coins,
  UserCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { clearApiCache } from '@/lib/api';
import { Spinner } from '@/components/ui/UI';

const JOB_SEEKER_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Explore Jobs', icon: Briefcase },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/resume', label: 'Resume AI', icon: FileSearch },
  { href: '/resume-builder', label: 'CV Builder', icon: FileText },
  { href: '/mock-interview', label: 'Voice Interview', icon: Mic },
  { href: '/saved-jobs', label: 'Saved Jobs', icon: Bookmark },
  { href: '/applied-jobs', label: 'Applied Jobs', icon: Send },
];

const RECRUITER_NAV = [
  { href: '/recruiter', label: 'Recruiter Hub', icon: Building2 },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Admin Console', icon: ShieldCheck },
  { href: '/jobs', label: 'All Jobs', icon: Briefcase },
];

// Avoid firing /auth/profile on every single sidebar click
let lastBackgroundSyncAt = 0;

export default function AppShell({
  children,
  title = '',
  subtitle = '',
  allowedRoles = null,
}) {
  const {
    user,
    loading,
    logout,
    refreshUser,
    isJobSeeker,
    isRecruiter,
    isAdmin,
  } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const now = Date.now();
      if (now - lastBackgroundSyncAt > 45000) {
        lastBackgroundSyncAt = now;
        refreshUser();
      }
    }
  }, [loading, user?.id, refreshUser]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (isAdmin) router.replace('/admin');
      else if (isRecruiter) router.replace('/recruiter');
      else router.replace('/dashboard');
    }
  }, [user, loading, allowedRoles, isAdmin, isRecruiter, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Spinner label="Loading your workspace..." />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Spinner label="Redirecting..." />
      </div>
    );
  }

  const navItems = isAdmin
    ? ADMIN_NAV
    : isRecruiter
    ? RECRUITER_NAV
    : JOB_SEEKER_NAV;

  const isPremium = user.plan === 'premium';

  const handleLogout = () => {
    lastBackgroundSyncAt = 0;
    clearApiCache();
    logout();
    router.push('/login');
  };

  const roleLabel = isAdmin
    ? 'Administrator'
    : isRecruiter
    ? user.companyName || 'Recruiter'
    : user.role === 'job_seeker_fresher'
    ? 'Fresher'
    : 'Experienced';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-ink text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 text-white flex items-center justify-center shadow-md">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            CareerGuide<span className="text-coral-500">.ai</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-coral-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {isJobSeeker && (
        <div className="px-3 pb-3">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-200">
                <Crown
                  className={`w-3.5 h-3.5 ${
                    isPremium ? 'text-amber-400' : 'text-stone-400'
                  }`}
                />
                {isPremium ? 'Premium Plan' : 'Free Plan'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-tealbrand-100 bg-tealbrand-600/20 px-2 py-0.5 rounded-full">
                <Coins className="w-3 h-3 text-tealbrand-600" />
                {user.credits ?? 0}
              </span>
            </div>
            {!isPremium && (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-1.5 rounded-lg bg-coral-600 hover:bg-coral-700 text-white text-xs font-semibold transition-colors"
              >
                Upgrade to Premium
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-coral-200 shrink-0">
            <UserCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-stone-400 truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-canvas/85 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white border border-stone-200 text-ink hover:bg-sand"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              {title && (
                <h1 className="font-display font-semibold text-lg sm:text-xl text-ink truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-muted truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isJobSeeker && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-semibold text-ink">
                <Coins className="w-3.5 h-3.5 text-coral-600" />
                {user.credits ?? 0} Credits
              </span>
            )}
            {isPremium && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Crown className="w-3.5 h-3.5" />
                PRO
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
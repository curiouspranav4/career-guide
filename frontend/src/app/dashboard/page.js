'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Crown,
  Zap,
  Briefcase,
  Bookmark,
  Send,
  Mic,
  FileSearch,
  FileText,
  Building2,
  MapPin,
  IndianRupee,
  ArrowRight,
  CheckCircle2,
  Upload,
  TrendingUp,
  Coins,
  Sliders,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import UpgradeModal from '@/components/features/UpgradeModal';
import AutoApplyModal from '@/components/features/AutoApplyModal';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import { useAuth } from '@/context/AuthContext';
import {
  getProfile,
  getAllJobs,
  getMyResumes,
  getAppliedJobs,
  getSavedJobs,
  getInterviewHistory,
  applyJob,
  saveJob,
} from '@/lib/api';
import { formatSalary, formatDate, getMatchTone } from '@/lib/utils';

function unwrapArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function normalizeSkill(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function computeJobMatch(job, userSkills) {
  const required = Array.isArray(job?.requiredSkills)
    ? job.requiredSkills
    : Array.isArray(job?.skills)
    ? job.skills
    : [];

  if (!required.length) {
    return { percent: null, matched: [], missing: [] };
  }

  const userSet = new Set(userSkills.map(normalizeSkill));
  const matched = [];
  const missing = [];

  required.forEach((skill) => {
    const clean = normalizeSkill(skill);
    if (userSet.has(clean)) matched.push(skill);
    else missing.push(skill);
  });

  const percent = Math.round((matched.length / required.length) * 100);
  return { percent, matched, missing };
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const [busyJobId, setBusyJobId] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [autoApplyOpen, setAutoApplyOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [
        profileRes,
        jobsRes,
        resumesRes,
        appliedRes,
        savedRes,
        interviewsRes,
      ] = await Promise.allSettled([
        getProfile(),
        getAllJobs(),
        getMyResumes(),
        getAppliedJobs(),
        getSavedJobs(),
        getInterviewHistory(),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value?.data?.user || profileRes.value?.data || null);
      }
      if (jobsRes.status === 'fulfilled') {
        setJobs(unwrapArray(jobsRes.value?.data, ['jobs', 'data']));
      }
      if (resumesRes.status === 'fulfilled') {
        setResumes(unwrapArray(resumesRes.value?.data, ['resumes', 'data']));
      }
      if (appliedRes.status === 'fulfilled') {
        setAppliedJobs(
          unwrapArray(appliedRes.value?.data, ['appliedJobs', 'jobs', 'applications', 'data'])
        );
      }
      if (savedRes.status === 'fulfilled') {
        setSavedJobs(
          unwrapArray(savedRes.value?.data, ['savedJobs', 'jobs', 'data'])
        );
      }
      if (interviewsRes.status === 'fulfilled') {
        setInterviews(
          unwrapArray(interviewsRes.value?.data, ['interviews', 'history', 'data'])
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Latest resume & extracted skills
  const latestResume = resumes[0] || null;
  const userSkills = useMemo(() => {
    if (!latestResume) return [];
    const list =
      latestResume.extractedSkills ||
      latestResume.skills ||
      latestResume.parsedSkills ||
      [];
    return Array.isArray(list) ? list : [];
  }, [latestResume]);

  // Applied & Saved ID sets for instant UI feedback
  const appliedIds = useMemo(() => {
    return new Set(
      appliedJobs.map((item) => item?.job?._id || item?._id || item?.jobId || item)
    );
  }, [appliedJobs]);

  const savedIds = useMemo(() => {
    return new Set(
      savedJobs.map((item) => item?.job?._id || item?._id || item?.jobId || item)
    );
  }, [savedJobs]);

  // Recommended Jobs sorted by match percentage
  const recommendedJobs = useMemo(() => {
    const scored = jobs.map((job) => {
      const match = computeJobMatch(job, userSkills);
      return { ...job, _match: match };
    });

    scored.sort((a, b) => {
      const scoreA = a._match.percent ?? -1;
      const scoreB = b._match.percent ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return scored.slice(0, 6);
  }, [jobs, userSkills]);

  // Average interview score
  const avgInterviewScore = useMemo(() => {
    const scored = interviews.filter(
      (i) => typeof i.overallScore === 'number' || typeof i.score === 'number'
    );
    if (!scored.length) return null;
    const total = scored.reduce(
      (acc, i) => acc + Number(i.overallScore ?? i.score ?? 0),
      0
    );
    return Math.round(total / scored.length);
  }, [interviews]);

  const autoApplyCfg = profile?.autoApply || {};
  const autoApplyEnabled = Boolean(autoApplyCfg.enabled) && isPremium;

  const handleQuickApply = async (jobId) => {
    if (appliedIds.has(jobId)) return;
    setBusyJobId(jobId);
    try {
      await applyJob(jobId);
      toast.success('Application submitted!');
      setAppliedJobs((prev) => [{ _id: jobId }, ...prev]);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not apply. Please try again.'
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const handleToggleSave = async (jobId) => {
    setBusyJobId(jobId);
    try {
      await saveJob(jobId);
      if (savedIds.has(jobId)) {
        setSavedJobs((prev) =>
          prev.filter((j) => (j?.job?._id || j?._id || j) !== jobId)
        );
        toast.success('Removed from saved jobs');
      } else {
        setSavedJobs((prev) => [{ _id: jobId }, ...prev]);
        toast.success('Job saved for later');
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not update saved job.'
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const handleAutoApplySaved = (updatedCfg) => {
    setProfile((prev) => ({
      ...(prev || {}),
      autoApply: updatedCfg,
    }));
  };

  const handleUpgraded = async () => {
    await refreshUser();
    await loadDashboard();
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your career command center — matches, resumes, interviews & auto-apply"
      allowedRoles={['job_seeker_fresher', 'job_seeker_experienced']}
    >
      {loading ? (
        <Spinner label="Loading your career insights..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Top Editorial Dark Command Banner */}
          <div className="relative rounded-3xl bg-[#141418] text-white p-6 sm:p-8 overflow-hidden border border-white/10 shadow-lifted">
            <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-coral-600/25 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-tealbrand-600/20 blur-[100px]" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-coral-200">
                    <Sparkles className="w-3.5 h-3.5 text-coral-500" />
                    {user?.role === 'job_seeker_fresher'
                      ? 'Fresher Track'
                      : 'Experienced Track'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                      isPremium
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        : 'bg-white/5 text-stone-300 border-white/10'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    {isPremium ? 'Premium Active' : 'Free Plan'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tealbrand-600/20 border border-tealbrand-600/40 text-tealbrand-100 text-xs font-mono font-semibold">
                    <Coins className="w-3.5 h-3.5 text-tealbrand-600" />
                    {user?.credits ?? 0} Credits
                  </span>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
                  Welcome back, {user?.name?.split(' ')[0] || 'there'}.
                </h2>
                <p className="text-sm text-stone-300 mt-1.5 max-w-xl">
                  {userSkills.length > 0
                    ? `Your resume is synced with ${userSkills.length} detected skills. We've ranked open roles by your highest compatibility below.`
                    : 'Upload your PDF resume to unlock instant job match percentages, missing skill detection, and tailored AI mock interviews.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setAutoApplyOpen(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                    autoApplyEnabled
                      ? 'bg-tealbrand-600/25 border-tealbrand-600/50 text-tealbrand-100 hover:bg-tealbrand-600/35'
                      : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                  }`}
                >
                  <Zap
                    className={`w-4 h-4 ${
                      autoApplyEnabled ? 'text-tealbrand-600' : 'text-amber-400'
                    }`}
                  />
                  Auto-Apply: {autoApplyEnabled ? 'ON' : isPremium ? 'Paused' : 'Locked'}
                </button>

                {!isPremium && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => setUpgradeOpen(true)}
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to PRO
                  </Button>
                )}

                {userSkills.length === 0 && (
                  <Link href="/resume">
                    <Button variant="teal" size="md">
                      <Upload className="w-4 h-4" />
                      Upload Resume
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* 4-Card KPI Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/resume" className="group">
              <Card className="p-5 hover:shadow-lifted hover:-translate-y-0.5 transition-all h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center">
                    <FileSearch className="w-5 h-5" />
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-coral-600 transition-colors" />
                </div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {userSkills.length}
                </p>
                <p className="text-xs font-medium text-muted mt-0.5">
                  Extracted Resume Skills
                </p>
              </Card>
            </Link>

            <Link href="/applied-jobs" className="group">
              <Card className="p-5 hover:shadow-lifted hover:-translate-y-0.5 transition-all h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-tealbrand-50 text-tealbrand-700 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-tealbrand-700 transition-colors" />
                </div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {appliedJobs.length}
                </p>
                <p className="text-xs font-medium text-muted mt-0.5">
                  Applications Sent
                </p>
              </Card>
            </Link>

            <Link href="/saved-jobs" className="group">
              <Card className="p-5 hover:shadow-lifted hover:-translate-y-0.5 transition-all h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Bookmark className="w-5 h-5" />
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-700 transition-colors" />
                </div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {savedJobs.length}
                </p>
                <p className="text-xs font-medium text-muted mt-0.5">
                  Saved Opportunities
                </p>
              </Card>
            </Link>

            <Link href="/mock-interview" className="group">
              <Card className="p-5 hover:shadow-lifted hover:-translate-y-0.5 transition-all h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-stone-100 text-ink flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-ink transition-colors" />
                </div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {avgInterviewScore !== null ? `${avgInterviewScore}/100` : interviews.length}
                </p>
                <p className="text-xs font-medium text-muted mt-0.5">
                  {avgInterviewScore !== null
                    ? `Avg Score (${interviews.length} mocks)`
                    : 'AI Mock Interviews'}
                </p>
              </Card>
            </Link>
          </div>

          {/* Resume Skills & Quick Tools Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Skill Profile Snapshot */}
            <Card className="lg:col-span-7 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-lg text-ink">
                      Your Active Skill Profile
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      {latestResume
                        ? `Parsed from ${latestResume.fileName || latestResume.originalName || 'latest resume'} • ${formatDate(latestResume.createdAt)}`
                        : 'No resume uploaded yet'}
                    </p>
                  </div>
                  <Link href="/resume">
                    <Button variant="secondary" size="sm">
                      {latestResume ? 'Update Resume' : 'Upload PDF'}
                    </Button>
                  </Link>
                </div>

                {userSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userSkills.slice(0, 18).map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-lg bg-sand text-ink text-xs font-semibold border border-stone-200/80"
                      >
                        {skill}
                      </span>
                    ))}
                    {userSkills.length > 18 && (
                      <span className="px-3 py-1 rounded-lg bg-coral-50 text-coral-700 text-xs font-semibold border border-coral-200">
                        +{userSkills.length - 18} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-canvas border border-dashed border-stone-300 p-5 text-center">
                    <p className="text-sm font-medium text-ink">
                      Upload your PDF resume to enable AI Job Matching
                    </p>
                    <p className="text-xs text-muted mt-1">
                      We detect skills automatically across 12+ industries so
                      every job card shows your exact fit score.
                    </p>
                  </div>
                )}
              </div>

              {/* Auto-Apply Summary Strip */}
              <div className="mt-5 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Sliders className="w-3.5 h-3.5 text-coral-600" />
                  {autoApplyEnabled ? (
                    <span>
                      Auto-Apply active for{' '}
                      <strong className="text-ink">
                        {autoApplyCfg.minMatchPercentage ?? autoApplyCfg.minMatch ?? 70}%+ match
                      </strong>
                      {autoApplyCfg.minSalaryLPA > 0
                        ? ` • ${autoApplyCfg.minSalaryLPA}+ LPA`
                        : ''}
                    </span>
                  ) : (
                    <span>
                      Turn on Smart Auto-Apply to apply automatically while you
                      prepare.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAutoApplyOpen(true)}
                  className="text-xs font-bold text-coral-600 hover:text-coral-700"
                >
                  Configure →
                </button>
              </div>
            </Card>

            {/* Quick Launch Tools */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
              {[
                {
                  href: '/mock-interview',
                  icon: Mic,
                  tone: 'bg-coral-600 text-white',
                  title: 'Voice Interview',
                  desc: '12 Qs + live code scoring',
                },
                {
                  href: '/resume-builder',
                  icon: FileText,
                  tone: 'bg-tealbrand-600 text-white',
                  title: 'CV Builder',
                  desc: '11 ATS-ready templates',
                },
                {
                  href: '/jobs',
                  icon: Briefcase,
                  tone: 'bg-ink text-white',
                  title: 'Explore Jobs',
                  desc: `${jobs.length} live openings`,
                },
                {
                  href: '/companies',
                  icon: Building2,
                  tone: 'bg-amber-500 text-white',
                  title: 'Companies',
                  desc: 'Verified hiring teams',
                },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link key={tool.href} href={tool.href} className="group">
                    <Card className="p-4 h-full flex flex-col justify-between hover:shadow-lifted hover:-translate-y-0.5 transition-all">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 shadow-sm ${tool.tone}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-sm text-ink group-hover:text-coral-600 transition-colors">
                          {tool.title}
                        </h4>
                        <p className="text-[11px] text-muted mt-0.5">
                          {tool.desc}
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recommended Jobs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-semibold text-xl text-ink flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-coral-600" />
                  Recommended Roles For You
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {userSkills.length > 0
                    ? 'Ranked by highest compatibility with your resume skills'
                    : 'Latest open roles across verified companies'}
                </p>
              </div>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-coral-600 hover:text-coral-700"
              >
                View all jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {recommendedJobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No jobs posted yet"
                description="Once recruiters publish new roles, your top skill-matched opportunities will appear right here."
                action={
                  <Link href="/jobs">
                    <Button variant="primary">Browse Jobs Board</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendedJobs.map((job) => {
                  const id = job._id || job.id;
                  const isApplied = appliedIds.has(id);
                  const isSaved = savedIds.has(id);
                  const match = job._match;
                  const tone =
                    match.percent !== null
                      ? getMatchTone(match.percent)
                      : null;
                  const jobSkills =
                    job.requiredSkills || job.skills || [];

                  return (
                    <Card
                      key={id}
                      className="p-5 flex flex-col justify-between hover:shadow-lifted transition-all"
                    >
                      <div>
                        {/* Card Top */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <Link
                              href={`/jobs/${id}`}
                              className="font-display font-semibold text-base text-ink hover:text-coral-600 transition-colors line-clamp-1"
                            >
                              {job.title}
                            </Link>
                            <p className="text-xs font-medium text-muted mt-0.5 truncate">
                              {job.company || job.companyName || 'Verified Company'}
                            </p>
                          </div>

                          {tone ? (
                            <span
                              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${tone.badge}`}
                            >
                              {match.percent}% Match
                            </span>
                          ) : (
                            <Badge tone="neutral">
                              {job.experienceLevel || job.type || 'Open'}
                            </Badge>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-3.5">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-coral-600" />
                            {job.location || 'Remote'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium text-ink">
                            <IndianRupee className="w-3.5 h-3.5 text-tealbrand-600" />
                            {formatSalary(job)}
                          </span>
                        </div>

                        {/* Skills Chips */}
                        {jobSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {jobSkills.slice(0, 4).map((skill) => {
                              const isMatched = match.matched.includes(skill);
                              return (
                                <span
                                  key={skill}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                    isMatched
                                      ? 'bg-tealbrand-50 text-tealbrand-700 border-tealbrand-100'
                                      : 'bg-canvas text-muted border-stone-200'
                                  }`}
                                >
                                  {skill}
                                </span>
                              );
                            })}
                            {jobSkills.length > 4 && (
                              <span className="px-2 py-0.5 rounded-md text-[11px] text-muted bg-canvas border border-stone-200">
                                +{jobSkills.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
                        <Link
                          href={`/jobs/${id}`}
                          className="text-xs font-semibold text-muted hover:text-ink transition-colors"
                        >
                          Details →
                        </Link>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyJobId === id}
                            onClick={() => handleToggleSave(id)}
                            className={`p-2 rounded-xl border transition-colors ${
                              isSaved
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-canvas border-stone-200 text-muted hover:text-ink'
                            }`}
                            title={isSaved ? 'Remove bookmark' : 'Save job'}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${
                                isSaved ? 'fill-current' : ''
                              }`}
                            />
                          </button>

                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-tealbrand-50 border border-tealbrand-100 text-tealbrand-700 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Applied
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              loading={busyJobId === id}
                              onClick={() => handleQuickApply(id)}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Applications Strip (if any) */}
          {appliedJobs.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg text-ink flex items-center gap-2">
                  <Clock className="w-4 h-4 text-tealbrand-600" />
                  Recent Applications
                </h3>
                <Link
                  href="/applied-jobs"
                  className="text-xs font-semibold text-coral-600 hover:text-coral-700"
                >
                  Track all ({appliedJobs.length}) →
                </Link>
              </div>
              <div className="divide-y divide-stone-100">
                {appliedJobs.slice(0, 4).map((item, idx) => {
                  const jobObj = item?.job || item;
                  const status = item?.status || item?.applicationStatus || 'Applied';
                  const statusTone =
                    status.toLowerCase().includes('shortlist') ||
                    status.toLowerCase().includes('hire') ||
                    status.toLowerCase().includes('accept')
                      ? 'teal'
                      : status.toLowerCase().includes('reject')
                      ? 'rose'
                      : status.toLowerCase().includes('interview')
                      ? 'amber'
                      : 'neutral';

                  return (
                    <div
                      key={jobObj?._id || idx}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {jobObj?.title || 'Job Role'}
                        </p>
                        <p className="text-xs text-muted truncate">
                          {jobObj?.company || jobObj?.companyName || 'Company'}
                          {jobObj?.location ? ` • ${jobObj.location}` : ''}
                        </p>
                      </div>
                      <Badge tone={statusTone}>{status}</Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onUpgraded={handleUpgraded}
      />

      <AutoApplyModal
        open={autoApplyOpen}
        onClose={() => setAutoApplyOpen(false)}
        initialSettings={autoApplyCfg}
        onSaved={handleAutoApplySaved}
        onOpenUpgrade={() => setUpgradeOpen(true)}
      />
    </AppShell>
  );
}
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  IndianRupee,
  Clock,
  Briefcase,
  Bookmark,
  CheckCircle2,
  XCircle,
  Sparkles,
  Mic,
  FileSearch,
  Bell,
  Users,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import { useAuth } from '@/context/AuthContext';
import {
  getJobById,
  getJobMatch,
  getMyResumes,
  getAppliedJobs,
  getSavedJobs,
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

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params?.id;
  const { user, isJobSeeker } = useAuth();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [hasResume, setHasResume] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadJobDetail = useCallback(async () => {
    if (!jobId || !user) return;
    setLoading(true);
    try {
      const requests = [getJobById(jobId)];
      if (isJobSeeker) {
        requests.push(
          getJobMatch(jobId),
          getMyResumes(),
          getAppliedJobs(),
          getSavedJobs()
        );
      }

      const results = await Promise.allSettled(requests);

      let loadedJob = null;
      if (results[0]?.status === 'fulfilled') {
        const raw = results[0].value?.data;
        loadedJob = raw?.job || raw?.data || raw || null;
        setJob(loadedJob);
      }

      if (isJobSeeker) {
        // Parse resumes to know if user has uploaded one
        let userSkills = [];
        if (results[2]?.status === 'fulfilled') {
          const resumes = unwrapArray(results[2].value?.data, ['resumes', 'data']);
          if (resumes.length > 0) {
            setHasResume(true);
            const latest = resumes[0];
            const list =
              latest?.extractedSkills ||
              latest?.skills ||
              latest?.parsedSkills ||
              [];
            userSkills = Array.isArray(list) ? list : [];
          }
        }

        // Prefer backend match endpoint; fallback to client calculation
        if (results[1]?.status === 'fulfilled' && results[1].value?.data) {
          const d = results[1].value.data;
          const pct =
            d.matchPercentage ?? d.matchScore ?? d.percentage ?? d.score;
          if (typeof pct === 'number') {
            setMatchData({
              percent: Math.round(pct),
              matched: d.matchedSkills || d.matched || [],
              missing: d.missingSkills || d.missing || [],
            });
          }
        } else if (loadedJob && userSkills.length > 0) {
          const reqSkills =
            loadedJob.requiredSkills || loadedJob.skills || [];
          if (reqSkills.length > 0) {
            const set = new Set(userSkills.map(normalizeSkill));
            const matched = [];
            const missing = [];
            reqSkills.forEach((sk) => {
              if (set.has(normalizeSkill(sk))) matched.push(sk);
              else missing.push(sk);
            });
            setMatchData({
              percent: Math.round((matched.length / reqSkills.length) * 100),
              matched,
              missing,
            });
          }
        }

        // Check applied status
        if (results[3]?.status === 'fulfilled') {
          const appliedList = unwrapArray(results[3].value?.data, [
            'appliedJobs',
            'jobs',
            'applications',
            'data',
          ]);
          const found = appliedList.find(
            (item) =>
              String(item?.job?._id || item?._id || item?.jobId || item) ===
              String(jobId)
          );
          if (found) {
            setIsApplied(true);
            setApplicationStatus(
              found.status || found.applicationStatus || 'Applied'
            );
          }
        }

        // Check saved status
        if (results[4]?.status === 'fulfilled') {
          const savedList = unwrapArray(results[4].value?.data, [
            'savedJobs',
            'jobs',
            'data',
          ]);
          const foundSaved = savedList.some(
            (item) =>
              String(item?.job?._id || item?._id || item?.jobId || item) ===
              String(jobId)
          );
          setIsSaved(foundSaved);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [jobId, user, isJobSeeker]);

  useEffect(() => {
    loadJobDetail();
  }, [loadJobDetail]);

  const requiredSkills = useMemo(() => {
    if (!job) return [];
    return Array.isArray(job.requiredSkills)
      ? job.requiredSkills
      : Array.isArray(job.skills)
      ? job.skills
      : [];
  }, [job]);

  const updates = useMemo(() => {
    if (!job) return [];
    const list = job.updates || job.announcements || [];
    return Array.isArray(list) ? [...list].reverse() : [];
  }, [job]);

  const handleApply = async () => {
    if (!isJobSeeker || isApplied) return;
    setBusy(true);
    try {
      await applyJob(jobId);
      setIsApplied(true);
      setApplicationStatus('Applied');
      toast.success('Application submitted successfully!');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not submit application.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSave = async () => {
    if (!isJobSeeker) return;
    setBusy(true);
    try {
      await saveJob(jobId);
      setIsSaved((prev) => {
        const next = !prev;
        toast.success(next ? 'Job bookmarked!' : 'Removed from saved jobs');
        return next;
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not update saved job.'
      );
    } finally {
      setBusy(false);
    }
  };

  const matchTone =
    matchData && typeof matchData.percent === 'number'
      ? getMatchTone(matchData.percent)
      : null;

  return (
    <AppShell
      title="Job Details"
      subtitle="Full role overview, AI skill compatibility & recruiter updates"
    >
      {loading ? (
        <Spinner label="Loading job details..." />
      ) : !job ? (
        <EmptyState
          icon={AlertCircle}
          title="Job not found"
          description="This role may have been closed or removed by the recruiter."
          action={
            <Link href="/jobs">
              <Button variant="primary">Back to Explore Jobs</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Back Link */}
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to all jobs
          </Link>

          {/* Dark Hero Summary Card */}
          <div className="relative rounded-3xl bg-[#141418] text-white p-6 sm:p-8 overflow-hidden border border-white/10 shadow-lifted">
            <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-coral-600/25 blur-[110px]" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-stone-200">
                    <Building2 className="w-3.5 h-3.5 text-coral-500" />
                    {job.company || job.companyName || 'Verified Company'}
                  </span>
                  {(job.experienceLevel || job.experience) && (
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-stone-200">
                      {job.experienceLevel || job.experience}
                    </span>
                  )}
                  {job.category && (
                    <span className="px-3 py-1 rounded-full bg-coral-600/20 border border-coral-500/35 text-xs font-semibold text-coral-200">
                      {job.category}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-stone-300 pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-coral-500" />
                    {job.location || 'Remote'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                    <IndianRupee className="w-4 h-4 text-tealbrand-600" />
                    {formatSalary(job)}
                  </span>
                  {job.type && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-amber-400" />
                      {job.type}
                    </span>
                  )}
                  {job.createdAt && (
                    <span className="inline-flex items-center gap-1.5 text-stone-400">
                      <Clock className="w-4 h-4" />
                      Posted {formatDate(job.createdAt)}
                    </span>
                  )}
                  {Array.isArray(job.applicants) && (
                    <span className="inline-flex items-center gap-1.5 text-stone-400">
                      <Users className="w-4 h-4" />
                      {job.applicants.length} applicant
                      {job.applicants.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {isJobSeeker && (
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleToggleSave}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      isSaved
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                        : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`}
                    />
                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  {isApplied ? (
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tealbrand-600/25 border border-tealbrand-600/50 text-tealbrand-100 text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-tealbrand-600" />
                      Status: {applicationStatus || 'Applied'}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      loading={busy}
                      onClick={handleApply}
                    >
                      Apply Now
                    </Button>
                  )}

                  {job.applyLink && (
                    <a
                      href={job.applyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-stone-200 hover:bg-white/15"
                    >
                      External Link
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Main Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Description, Skills & Recruiter Updates */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 sm:p-7 space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink mb-3">
                    About the Role
                  </h2>
                  <div className="text-sm text-ink/85 leading-relaxed whitespace-pre-line">
                    {job.description ||
                      'No detailed description provided by the recruiter.'}
                  </div>
                </div>

                {requiredSkills.length > 0 && (
                  <div className="pt-5 border-t border-stone-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                      Required Skills ({requiredSkills.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {requiredSkills.map((skill) => {
                        const isMatched = matchData?.matched?.some(
                          (m) => normalizeSkill(m) === normalizeSkill(skill)
                        );
                        return (
                          <span
                            key={skill}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                              isMatched
                                ? 'bg-tealbrand-50 text-tealbrand-700 border-tealbrand-100'
                                : 'bg-sand text-ink border-stone-200'
                            }`}
                          >
                            {isMatched ? '✓ ' : ''}
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>

              {/* Recruiter Updates / Announcements */}
              <Card className="p-6 sm:p-7">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                    <Bell className="w-4 h-4 text-coral-600" />
                    Recruiter Updates &amp; Announcements
                  </h2>
                  <Badge tone="neutral">{updates.length}</Badge>
                </div>

                {updates.length === 0 ? (
                  <p className="text-xs text-muted bg-canvas border border-stone-200/80 rounded-xl p-4">
                    No announcements posted for this role yet. When the
                    recruiter shares interview dates or shortlisting updates,
                    they will appear here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {updates.map((upd, idx) => (
                      <div
                        key={upd._id || idx}
                        className="p-4 rounded-2xl bg-canvas border border-stone-200/80"
                      >
                        <p className="text-sm text-ink leading-relaxed">
                          {upd.message || upd.text}
                        </p>
                        {(upd.createdAt || upd.date) && (
                          <p className="text-[11px] text-muted mt-1.5">
                            {formatDate(upd.createdAt || upd.date)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: AI Skill Match Panel & Prep Actions */}
            <div className="lg:col-span-4 space-y-5">
              {isJobSeeker && (
                <Card className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-lg text-ink flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-coral-600" />
                      AI Match Analysis
                    </h3>
                    {matchTone && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${matchTone.badge}`}
                      >
                        {matchData.percent}%
                      </span>
                    )}
                  </div>

                  {matchTone ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-muted">
                          <span>Compatibility Score</span>
                          <span className={`font-mono font-bold ${matchTone.text}`}>
                            {matchData.matched.length} /{' '}
                            {matchData.matched.length + matchData.missing.length}{' '}
                            skills
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-sand overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${matchTone.bar}`}
                            style={{ width: `${matchData.percent}%` }}
                          />
                        </div>
                      </div>

                      {matchData.matched.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-tealbrand-700 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Matched Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {matchData.matched.map((s) => (
                              <span
                                key={s}
                                className="px-2.5 py-1 rounded-lg bg-tealbrand-50 text-tealbrand-700 border border-tealbrand-100 text-xs font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {matchData.missing.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-coral-700 mb-2 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Skill Gaps to Address
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {matchData.missing.map((s) => (
                              <span
                                key={s}
                                className="px-2.5 py-1 rounded-lg bg-coral-50 text-coral-700 border border-coral-200 text-xs font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl bg-canvas border border-dashed border-stone-300 p-4 text-center space-y-3">
                      <FileSearch className="w-6 h-6 text-coral-600 mx-auto" />
                      <p className="text-xs text-muted leading-relaxed">
                        {hasResume
                          ? 'This role does not list structured required skills yet.'
                          : 'Upload your PDF resume to see your exact match percentage and missing skills for this job.'}
                      </p>
                      {!hasResume && (
                        <Link href="/resume" className="block">
                          <Button variant="primary" size="sm" className="w-full">
                            Upload Resume
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* Practice Interview Card */}
              {isJobSeeker && (
                <div className="rounded-2xl bg-ink text-white p-6 space-y-3 shadow-lifted">
                  <div className="w-10 h-10 rounded-xl bg-coral-600/25 border border-coral-500/40 text-coral-200 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-coral-500" />
                  </div>
                  <h3 className="font-display font-semibold text-lg">
                    Prep for {job.title}
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Run a 12-question Voice + Live-Code AI mock interview
                    tailored to this role before your real interview.
                  </p>
                  <Link href="/mock-interview" className="block pt-1">
                    <Button variant="primary" size="md" className="w-full">
                      Start Mock Interview
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
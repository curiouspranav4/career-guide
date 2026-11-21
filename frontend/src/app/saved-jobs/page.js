'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  BookmarkX,
  MapPin,
  IndianRupee,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Search,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import {
  getSavedJobs,
  getAppliedJobs,
  getMyResumes,
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

  if (!required.length || !userSkills.length) {
    return { percent: null, matched: [], missing: required };
  }

  const userSet = new Set(userSkills.map(normalizeSkill));
  const matched = [];
  const missing = [];

  required.forEach((skill) => {
    if (userSet.has(normalizeSkill(skill))) matched.push(skill);
    else missing.push(skill);
  });

  return {
    percent: Math.round((matched.length / required.length) * 100),
    matched,
    missing,
  };
}

export default function SavedJobsPage() {
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [userSkills, setUserSkills] = useState([]);
  const [busyJobId, setBusyJobId] = useState(null);
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [savedRes, appliedRes, resumesRes] = await Promise.allSettled([
        getSavedJobs(),
        getAppliedJobs(),
        getMyResumes(),
      ]);

      if (savedRes.status === 'fulfilled') {
        const raw = unwrapArray(savedRes.value?.data, [
          'savedJobs',
          'jobs',
          'data',
        ]);
        // Normalize in case items are wrapped as { job: {...} }
        const normalized = raw
          .map((item) => (item?.job && typeof item.job === 'object' ? item.job : item))
          .filter((item) => item && typeof item === 'object');
        setSavedJobs(normalized);
      }

      if (appliedRes.status === 'fulfilled') {
        const applied = unwrapArray(appliedRes.value?.data, [
          'appliedJobs',
          'jobs',
          'applications',
          'data',
        ]);
        setAppliedIds(
          new Set(
            applied.map(
              (item) => item?.job?._id || item?._id || item?.jobId || item
            )
          )
        );
      }

      if (resumesRes.status === 'fulfilled') {
        const resumes = unwrapArray(resumesRes.value?.data, ['resumes', 'data']);
        const latest = resumes[0];
        const skills =
          latest?.extractedSkills ||
          latest?.skills ||
          latest?.parsedSkills ||
          [];
        setUserSkills(Array.isArray(skills) ? skills : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return savedJobs
      .map((job) => ({
        ...job,
        _match: computeJobMatch(job, userSkills),
      }))
      .filter((job) => {
        if (!q) return true;
        const skillsArr = job.requiredSkills || job.skills || [];
        const haystack = [
          job.title,
          job.company,
          job.companyName,
          job.location,
          ...skillsArr,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [savedJobs, userSkills, query]);

  const handleUnsave = async (jobId) => {
    setBusyJobId(jobId);
    try {
      await saveJob(jobId);
      setSavedJobs((prev) => prev.filter((j) => (j._id || j.id) !== jobId));
      toast.success('Removed from saved jobs');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not remove saved job.'
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const handleApply = async (jobId) => {
    if (appliedIds.has(jobId)) return;
    setBusyJobId(jobId);
    try {
      await applyJob(jobId);
      setAppliedIds((prev) => new Set([...prev, jobId]));
      toast.success('Application submitted!');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not apply to this job.'
      );
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <AppShell
      title="Saved Jobs"
      subtitle="Shortlisted opportunities you want to revisit and apply to"
      allowedRoles={['job_seeker_fresher', 'job_seeker_experienced']}
    >
      {loading ? (
        <Spinner label="Loading your saved roles..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Top Summary & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <Bookmark className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-ink">
                  {savedJobs.length} Saved Role{savedJobs.length === 1 ? '' : 's'}
                </h2>
                <p className="text-xs text-muted">
                  Apply before deadlines close
                </p>
              </div>
            </div>

            {savedJobs.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter saved jobs..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                />
              </div>
            )}
          </div>

          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title={
                savedJobs.length === 0
                  ? 'No saved jobs yet'
                  : 'No saved jobs match your search'
              }
              description={
                savedJobs.length === 0
                  ? 'Bookmark interesting openings from the Jobs board so you can compare skill matches and apply when ready.'
                  : 'Try clearing your filter keyword to view all bookmarked roles.'
              }
              action={
                savedJobs.length === 0 ? (
                  <Link href="/jobs">
                    <Button variant="primary">
                      <Briefcase className="w-4 h-4" />
                      Explore Open Jobs
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    Clear Search
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredJobs.map((job) => {
                const id = job._id || job.id;
                const isApplied = appliedIds.has(id);
                const match = job._match;
                const tone =
                  match.percent !== null ? getMatchTone(match.percent) : null;
                const jobSkills = job.requiredSkills || job.skills || [];

                return (
                  <Card
                    key={id}
                    className="p-5 flex flex-col justify-between hover:shadow-lifted transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <Link
                            href={`/jobs/${id}`}
                            className="font-display font-semibold text-base text-ink hover:text-coral-600 transition-colors line-clamp-1"
                          >
                            {job.title}
                          </Link>
                          <p className="text-xs font-semibold text-muted mt-0.5 truncate">
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

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted mb-3.5">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-coral-600" />
                          {job.location || 'Remote'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-ink">
                          <IndianRupee className="w-3.5 h-3.5 text-tealbrand-600" />
                          {formatSalary(job)}
                        </span>
                        {job.createdAt && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(job.createdAt)}
                          </span>
                        )}
                      </div>

                      {jobSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {jobSkills.slice(0, 4).map((skill) => {
                            const matched = match.matched.includes(skill);
                            return (
                              <span
                                key={skill}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                  matched
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

                    <div className="pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/jobs/${id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-coral-600"
                      >
                        Details
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyJobId === id}
                          onClick={() => handleUnsave(id)}
                          className="p-2 rounded-xl border border-stone-200 bg-canvas text-muted hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                          title="Remove from saved"
                        >
                          <BookmarkX className="w-3.5 h-3.5" />
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
                            onClick={() => handleApply(id)}
                          >
                            Apply Now
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
      )}
    </AppShell>
  );
}
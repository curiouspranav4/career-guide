'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  IndianRupee,
  Briefcase,
  Bookmark,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Sparkles,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import { useAuth } from '@/context/AuthContext';
import {
  getAllJobs,
  getRecruiterJobs,
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

export default function JobsPage() {
  const { user, isJobSeeker, isRecruiter } = useAuth();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [userSkills, setUserSkills] = useState([]);
  const [hasResume, setHasResume] = useState(false);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [busyJobId, setBusyJobId] = useState(null);

  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [expFilter, setExpFilter] = useState('all');
  const [minMatchOnly, setMinMatchOnly] = useState(false);
  const [sortBy, setSortBy] = useState('match');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Recruiters only ever see their own posted jobs
      const jobsPromise = isRecruiter ? getRecruiterJobs() : getAllJobs();
      const requests = [jobsPromise];

      if (isJobSeeker) {
        requests.push(getMyResumes(), getAppliedJobs(), getSavedJobs());
      }

      const results = await Promise.allSettled(requests);

      if (results[0]?.status === 'fulfilled') {
        setJobs(unwrapArray(results[0].value?.data, ['jobs', 'data']));
      }

      if (isJobSeeker) {
        if (results[1]?.status === 'fulfilled') {
          const resumes = unwrapArray(results[1].value?.data, [
            'resumes',
            'data',
          ]);
          setHasResume(resumes.length > 0);
          const latest = resumes[0];
          const skills =
            latest?.extractedSkills ||
            latest?.skills ||
            latest?.parsedSkills ||
            [];
          setUserSkills(Array.isArray(skills) ? skills : []);
        }

        if (results[2]?.status === 'fulfilled') {
          const applied = unwrapArray(results[2].value?.data, [
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

        if (results[3]?.status === 'fulfilled') {
          const saved = unwrapArray(results[3].value?.data, [
            'savedJobs',
            'jobs',
            'data',
          ]);
          setSavedIds(
            new Set(
              saved.map(
                (item) => item?.job?._id || item?._id || item?.jobId || item
              )
            )
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, isJobSeeker, isRecruiter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const locations = useMemo(() => {
    const set = new Set();
    jobs.forEach((j) => {
      if (j.location) set.add(j.location.trim());
    });
    return Array.from(set).sort();
  }, [jobs]);

  const experienceLevels = useMemo(() => {
    const set = new Set();
    jobs.forEach((j) => {
      const val = j.experienceLevel || j.jobType || j.type;
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();

    const enriched = jobs.map((job) => ({
      ...job,
      _match: isJobSeeker
        ? computeJobMatch(job, userSkills)
        : { percent: null, matched: [], missing: [] },
    }));

    const filtered = enriched.filter((job) => {
      if (q) {
        const skillsArr = job.requiredSkills || job.skills || [];
        const haystack = [
          job.title,
          job.company,
          job.companyName,
          job.location,
          job.category,
          job.description,
          ...skillsArr,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (
        locationFilter !== 'all' &&
        (job.location || '').trim().toLowerCase() !==
          locationFilter.toLowerCase()
      ) {
        return false;
      }

      if (expFilter !== 'all') {
        const val = String(job.experienceLevel || job.jobType || job.type || '')
          .trim()
          .toLowerCase();
        if (val !== expFilter.toLowerCase()) return false;
      }

      if (minMatchOnly && (job._match.percent ?? 0) < 60) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'match' && isJobSeeker) {
        const diff = (b._match.percent ?? -1) - (a._match.percent ?? -1);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'salary') {
        const salDiff = (Number(b.salaryLPA) || 0) - (Number(a.salaryLPA) || 0);
        if (salDiff !== 0) return salDiff;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return filtered;
  }, [
    jobs,
    userSkills,
    isJobSeeker,
    query,
    locationFilter,
    expFilter,
    minMatchOnly,
    sortBy,
  ]);

  const hasActiveFilters =
    query.trim() !== '' ||
    locationFilter !== 'all' ||
    expFilter !== 'all' ||
    minMatchOnly;

  const clearFilters = () => {
    setQuery('');
    setLocationFilter('all');
    setExpFilter('all');
    setMinMatchOnly(false);
  };

  const handleApply = async (jobId) => {
    if (!isJobSeeker || appliedIds.has(jobId)) return;
    if (!hasResume) {
      toast.error('Please upload your PDF resume before applying to any job.', {
        action: {
          label: 'Upload Resume',
          onClick: () => {
            window.location.href = '/resume';
          },
        },
      });
      return;
    }
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

  const handleToggleSave = async (jobId) => {
    if (!isJobSeeker) return;
    setBusyJobId(jobId);
    try {
      await saveJob(jobId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(jobId)) {
          next.delete(jobId);
          toast.success('Removed from saved jobs');
        } else {
          next.add(jobId);
          toast.success('Saved job for later');
        }
        return next;
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not update saved status.'
      );
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <AppShell
      title={isRecruiter ? 'My Posted Jobs' : 'Explore Jobs'}
      subtitle={
        isRecruiter
          ? 'Showing only the job openings published by your account'
          : 'Search verified roles, inspect skill match scores, and apply in one click'
      }
    >
      {loading ? (
        <Spinner label="Fetching opportunities..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {isJobSeeker && !hasResume && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-sm font-medium text-amber-900">
                <strong>Resume required to apply:</strong> Upload your PDF
                resume once to unlock 1-click applications and AI skill match
                scores.
              </p>
              <Link href="/resume" className="shrink-0">
                <Button variant="primary" size="sm">
                  Upload Resume
                </Button>
              </Link>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <Card className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search role, company, or skill (e.g. React, Python)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                >
                  <option value="all">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={expFilter}
                  onChange={(e) => setExpFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                >
                  <option value="all">All Levels</option>
                  {experienceLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                >
                  {isJobSeeker && <option value="match">Best Match</option>}
                  <option value="newest">Newest First</option>
                  <option value="salary">Highest LPA</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-coral-600" />
                  Showing {filteredJobs.length} of {jobs.length} roles
                </span>

                {isJobSeeker && userSkills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMinMatchOnly((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-semibold transition-colors ${
                      minMatchOnly
                        ? 'bg-tealbrand-600 text-white border-tealbrand-600'
                        : 'bg-canvas text-muted border-stone-200 hover:text-ink'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    60%+ Match Only
                  </button>
                )}

                {isRecruiter && (
                  <Link
                    href="/recruiter"
                    className="inline-flex items-center gap-1 text-coral-600 hover:text-coral-700 font-semibold"
                  >
                    Manage applicants in Recruiter Hub →
                  </Link>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset filters
                </button>
              )}
            </div>
          </Card>

          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={
                isRecruiter
                  ? 'You have not posted any jobs yet'
                  : 'No matching jobs found'
              }
              description={
                hasActiveFilters
                  ? 'Try clearing your search or loosening the location and match filters.'
                  : isRecruiter
                  ? 'Go to Recruiter Hub to publish your first opening.'
                  : 'No open roles have been posted yet. Check back soon!'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                ) : isRecruiter ? (
                  <Link href="/recruiter">
                    <Button variant="primary">Open Recruiter Hub</Button>
                  </Link>
                ) : null
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredJobs.map((job) => {
                const id = job._id || job.id;
                const isApplied = appliedIds.has(id);
                const isSaved = savedIds.has(id);
                const match = job._match;
                const tone =
                  match.percent !== null ? getMatchTone(match.percent) : null;
                const jobSkills = job.requiredSkills || job.skills || [];

                return (
                  <Card
                    key={id}
                    className="p-5 flex flex-col justify-between hover:shadow-lifted hover:-translate-y-0.5 transition-all"
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
                            {job.company ||
                              job.companyName ||
                              'Verified Company'}
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
                            {job.experienceLevel || job.jobType || 'Open'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted mb-3">
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

                      {job.description && (
                        <p className="text-xs text-muted line-clamp-2 leading-relaxed mb-3.5">
                          {job.description}
                        </p>
                      )}

                      {jobSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {jobSkills.slice(0, 5).map((skill) => {
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
                                {matched ? '✓ ' : ''}
                                {skill}
                              </span>
                            );
                          })}
                          {jobSkills.length > 5 && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] text-muted bg-canvas border border-stone-200">
                              +{jobSkills.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/jobs/${id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-coral-600 transition-colors"
                      >
                        View Details
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>

                      {isJobSeeker && (
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
                              onClick={() => handleApply(id)}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      )}
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
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Send,
  Search,
  MapPin,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Briefcase,
  ArrowUpRight,
  Bell,
  Zap,
  Mic,
  Hourglass,
  Award,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import { useAuth } from '@/context/AuthContext';
import { getAppliedJobs } from '@/lib/api';
import { formatSalary, formatDate } from '@/lib/utils';

function unwrapArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function getStatusMeta(rawStatus) {
  const s = String(rawStatus || 'Applied').trim().toLowerCase();

  if (s.includes('hire') || s.includes('select') || s.includes('offer') || s.includes('accept')) {
    return {
      key: 'hired',
      label: rawStatus || 'Selected',
      tone: 'teal',
      icon: Award,
      step: 4,
    };
  }
  if (s.includes('interview')) {
    return {
      key: 'interview',
      label: rawStatus || 'Interview',
      tone: 'amber',
      icon: Mic,
      step: 3,
    };
  }
  if (s.includes('shortlist') || s.includes('review')) {
    return {
      key: 'shortlisted',
      label: rawStatus || 'Shortlisted',
      tone: 'coral',
      icon: Sparkles,
      step: 2,
    };
  }
  if (s.includes('reject') || s.includes('declin')) {
    return {
      key: 'rejected',
      label: rawStatus || 'Rejected',
      tone: 'rose',
      icon: XCircle,
      step: 0,
    };
  }

  return {
    key: 'applied',
    label: rawStatus || 'Applied',
    tone: 'neutral',
    icon: Hourglass,
    step: 1,
  };
}

function normalizeApplication(item, currentUserId) {
  const job =
    item?.job && typeof item.job === 'object' ? item.job : item || {};

  // Check if applicant record is embedded inside job.applicants
  let embeddedApplicant = null;
  if (Array.isArray(job.applicants) && currentUserId) {
    embeddedApplicant = job.applicants.find((a) => {
      const uid = a?.user?._id || a?.user || a?.userId || a?._id;
      return String(uid) === String(currentUserId);
    });
  }

  const status =
    item?.status ||
    item?.applicationStatus ||
    embeddedApplicant?.status ||
    'Applied';

  const appliedAt =
    item?.appliedAt ||
    embeddedApplicant?.appliedAt ||
    item?.createdAt ||
    job?.createdAt ||
    null;

  const isAutoApplied = Boolean(
    item?.autoApplied ||
      item?.isAutoApplied ||
      embeddedApplicant?.autoApplied ||
      embeddedApplicant?.isAutoApplied
  );

  const updates = Array.isArray(job.updates)
    ? job.updates
    : Array.isArray(item?.updates)
    ? item.updates
    : [];

  return {
    id: job._id || job.id || item._id,
    job,
    status,
    statusMeta: getStatusMeta(status),
    appliedAt,
    isAutoApplied,
    updates,
  };
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'hired', label: 'Selected' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AppliedJobsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAppliedJobs();
      const raw = unwrapArray(data, [
        'appliedJobs',
        'applications',
        'jobs',
        'data',
      ]);
      const normalized = raw
        .filter((item) => item && typeof item === 'object')
        .map((item) => normalizeApplication(item, user?.id));

      normalized.sort(
        (a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0)
      );
      setApplications(normalized);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) loadApplications();
  }, [user, loadApplications]);

  const counts = useMemo(() => {
    const map = {
      all: applications.length,
      applied: 0,
      shortlisted: 0,
      interview: 0,
      hired: 0,
      rejected: 0,
    };
    applications.forEach((app) => {
      const k = app.statusMeta.key;
      if (map[k] !== undefined) map[k] += 1;
    });
    return map;
  }, [applications]);

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== 'all' && app.statusMeta.key !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const job = app.job;
      const haystack = [
        job.title,
        job.company,
        job.companyName,
        job.location,
        app.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [applications, statusFilter, query]);

  return (
    <AppShell
      title="Applied Jobs"
      subtitle="Track every application stage, recruiter updates & interview invites"
      allowedRoles={['job_seeker_fresher', 'job_seeker_experienced']}
    >
      {loading ? (
        <Spinner label="Loading your applications..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Pipeline KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-ink text-white flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {counts.all}
                </p>
                <p className="text-xs font-medium text-muted">Total Applied</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {counts.shortlisted + counts.interview}
                </p>
                <p className="text-xs font-medium text-muted">
                  Shortlisted / Interview
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-tealbrand-50 text-tealbrand-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {counts.hired}
                </p>
                <p className="text-xs font-medium text-muted">
                  Offers / Selected
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Hourglass className="w-4 h-4" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {counts.applied}
                </p>
                <p className="text-xs font-medium text-muted">Under Review</p>
              </div>
            </Card>
          </div>

          {/* Filter Tabs & Search */}
          {applications.length > 0 && (
            <Card className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTER_TABS.map((tab) => {
                  const active = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-ink text-white shadow-sm'
                          : 'bg-canvas text-muted hover:text-ink border border-stone-200'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`ml-1.5 font-mono text-[11px] ${
                          active ? 'text-stone-300' : 'text-muted'
                        }`}
                      >
                        {counts[tab.key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search role or company..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                />
              </div>
            </Card>
          )}

          {/* Application List */}
          {filteredApps.length === 0 ? (
            <EmptyState
              icon={Send}
              title={
                applications.length === 0
                  ? 'No applications yet'
                  : 'No applications match this filter'
              }
              description={
                applications.length === 0
                  ? 'Explore skill-matched roles and submit your first application to start tracking your progress here.'
                  : 'Switch back to "All" or clear your search query to view all applications.'
              }
              action={
                applications.length === 0 ? (
                  <Link href="/jobs">
                    <Button variant="primary">
                      <Briefcase className="w-4 h-4" />
                      Explore Open Jobs
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatusFilter('all');
                      setQuery('');
                    }}
                  >
                    Reset Filters
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app, idx) => {
                const { job, statusMeta, appliedAt, isAutoApplied, updates } =
                  app;
                const StatusIcon = statusMeta.icon;
                const latestUpdate =
                  updates.length > 0 ? updates[updates.length - 1] : null;

                return (
                  <Card
                    key={app.id || idx}
                    className="p-5 sm:p-6 hover:shadow-lifted transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left Info */}
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/jobs/${app.id}`}
                            className="font-display font-semibold text-lg text-ink hover:text-coral-600 transition-colors"
                          >
                            {job.title || 'Job Opportunity'}
                          </Link>

                          <Badge tone={statusMeta.tone}>
                            <StatusIcon className="w-3 h-3" />
                            {statusMeta.label}
                          </Badge>

                          {isAutoApplied && (
                            <Badge tone="teal">
                              <Zap className="w-3 h-3" />
                              Auto-Applied
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-muted">
                          {job.company || job.companyName || 'Verified Company'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted pt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-coral-600" />
                            {job.location || 'Remote'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-ink">
                            <IndianRupee className="w-3.5 h-3.5 text-tealbrand-600" />
                            {formatSalary(job)}
                          </span>
                          {appliedAt && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Applied {formatDate(appliedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Link href="/mock-interview">
                          <Button variant="secondary" size="sm">
                            <Mic className="w-3.5 h-3.5 text-coral-600" />
                            Practice Interview
                          </Button>
                        </Link>
                        <Link href={`/jobs/${app.id}`}>
                          <Button variant="dark" size="sm">
                            View Role
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Visual Progress Bar (unless rejected) */}
                    {statusMeta.step > 0 && (
                      <div className="mt-5 pt-4 border-t border-stone-100">
                        <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold">
                          {[
                            { step: 1, label: 'Applied' },
                            { step: 2, label: 'Shortlisted' },
                            { step: 3, label: 'Interview' },
                            { step: 4, label: 'Selected' },
                          ].map((stage) => {
                            const reached = statusMeta.step >= stage.step;
                            return (
                              <div key={stage.step} className="space-y-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    reached
                                      ? 'bg-tealbrand-600'
                                      : 'bg-stone-200'
                                  }`}
                                />
                                <p
                                  className={
                                    reached ? 'text-tealbrand-700' : 'text-muted'
                                  }
                                >
                                  {stage.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Latest Recruiter Announcement */}
                    {latestUpdate && (
                      <div className="mt-4 p-3.5 rounded-xl bg-coral-50/60 border border-coral-200/70 flex items-start gap-2.5">
                        <Bell className="w-4 h-4 text-coral-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-coral-700">
                            Latest Recruiter Update
                          </p>
                          <p className="text-xs text-ink mt-0.5 leading-relaxed">
                            {latestUpdate.message || latestUpdate.text}
                          </p>
                        </div>
                      </div>
                    )}
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
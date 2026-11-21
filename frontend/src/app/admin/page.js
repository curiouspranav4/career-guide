'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Building2,
  CreditCard,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Crown,
  FileBadge,
  Globe,
  RefreshCw,
  IndianRupee,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import {
  getAllRecruiters,
  getAllJobSeekers,
  getAllJobsAdmin,
  getPaymentRequests,
  updateRecruiterStatus,
  updatePaymentStatus,
  deleteUser,
  deleteJobAdmin,
  getApplicantResume,
  resolveResumeUrl,
} from '@/lib/api';
import { formatSalary, formatDate, getMatchTone } from '@/lib/utils';

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('recruiters');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [loadingResumeKey, setLoadingResumeKey] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);
  const [query, setQuery] = useState('');
  const [expandedJobId, setExpandedJobId] = useState(null);

  const [recruiters, setRecruiters] = useState([]);
  const [jobSeekers, setJobSeekers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobs, setJobs] = useState([]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, seekersRes, payRes, jobRes] = await Promise.allSettled([
        getAllRecruiters(),
        getAllJobSeekers(),
        getPaymentRequests(),
        getAllJobsAdmin(),
      ]);

      if (recRes.status === 'fulfilled') {
        setRecruiters(Array.isArray(recRes.value?.data) ? recRes.value.data : []);
      }
      if (seekersRes.status === 'fulfilled') {
        setJobSeekers(
          Array.isArray(seekersRes.value?.data) ? seekersRes.value.data : []
        );
      }
      if (payRes.status === 'fulfilled') {
        setPayments(Array.isArray(payRes.value?.data) ? payRes.value.data : []);
      }
      if (jobRes.status === 'fulfilled') {
        setJobs(Array.isArray(jobRes.value?.data) ? jobRes.value.data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Combined users list (Job Seekers + Recruiters)
  const allUsers = useMemo(() => {
    return [...jobSeekers, ...recruiters].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [jobSeekers, recruiters]);

  const handleRecruiterAction = async (recruiterId, status) => {
    let reason = '';
    if (status === 'rejected') {
      reason =
        window.prompt('Optional rejection reason for this recruiter:') || '';
    }
    setBusyId(recruiterId);
    try {
      await updateRecruiterStatus(recruiterId, status, reason);
      setRecruiters((prev) =>
        prev.map((r) =>
          (r._id || r.id) === recruiterId
            ? {
                ...r,
                recruiterStatus: status,
                recruiterRejectionReason: reason || r.recruiterRejectionReason,
              }
            : r
        )
      );
      toast.success(
        status === 'approved'
          ? 'Recruiter approved!'
          : 'Recruiter status set to rejected.'
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to update recruiter status.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handlePaymentAction = async (paymentId, status) => {
    setBusyId(paymentId);
    try {
      await updatePaymentStatus(paymentId, status);
      setPayments((prev) =>
        prev.map((p) =>
          (p._id || p.id) === paymentId ? { ...p, status } : p
        )
      );
      toast.success(
        status === 'approved'
          ? 'Payment approved — Premium & 1,000 credits activated!'
          : 'Payment rejected.'
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to update payment status.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (userObj) => {
    const uid = userObj._id || userObj.id;
    if (!window.confirm(`Delete user "${userObj.name}" permanently?`)) return;
    setBusyId(uid);
    try {
      await deleteUser(uid);
      setJobSeekers((prev) => prev.filter((u) => (u._id || u.id) !== uid));
      setRecruiters((prev) => prev.filter((u) => (u._id || u.id) !== uid));
      toast.success('User deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job listing permanently?')) return;
    setBusyId(jobId);
    try {
      await deleteJobAdmin(jobId);
      setJobs((prev) => prev.filter((j) => (j._id || j.id) !== jobId));
      if (expandedJobId === jobId) setExpandedJobId(null);
      toast.success('Job deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete job.');
    } finally {
      setBusyId(null);
    }
  };

  const handleViewApplicantResume = async (userId, jobId) => {
    const key = `${jobId}-${userId}`;
    setLoadingResumeKey(key);
    try {
      const { data } = await getApplicantResume(userId, jobId);
      const url = resolveResumeUrl(
        data?.resume?.fileUrl,
        data?.resume?.filePath
      );
      if (!url) {
        toast.error('Resume file link not available.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'This applicant has not uploaded a resume.'
      );
    } finally {
      setLoadingResumeKey(null);
    }
  };

  const copyUtr = async (utr) => {
    try {
      await navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      toast.success('Copied!');
      setTimeout(() => setCopiedUtr(null), 1800);
    } catch {
      // ignore
    }
  };

  const pendingRecruitersCount = useMemo(
    () =>
      recruiters.filter(
        (r) => String(r.recruiterStatus || 'pending').toLowerCase() === 'pending'
      ).length,
    [recruiters]
  );

  const pendingPaymentsCount = useMemo(
    () =>
      payments.filter(
        (p) => String(p.status || 'pending').toLowerCase() === 'pending'
      ).length,
    [payments]
  );

  const q = query.trim().toLowerCase();

  const filteredRecruiters = useMemo(() => {
    const list = recruiters.filter((r) => {
      if (!q) return true;
      return `${r.name} ${r.email} ${r.companyName} ${r.gstin} ${r.recruiterStatus}`
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      const pa = String(a.recruiterStatus || 'pending') === 'pending' ? 0 : 1;
      const pb = String(b.recruiterStatus || 'pending') === 'pending' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [recruiters, q]);

  const filteredPayments = useMemo(() => {
    const list = payments.filter((p) => {
      if (!q) return true;
      return `${p.utr} ${p.razorpayOrderId} ${p.razorpayPaymentId} ${p.user?.name} ${p.user?.email} ${p.status}`
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      const pa = String(a.status || 'pending') === 'pending' ? 0 : 1;
      const pb = String(b.status || 'pending') === 'pending' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [payments, q]);

  const filteredUsers = useMemo(
    () =>
      allUsers.filter((u) => {
        if (!q) return true;
        return `${u.name} ${u.email} ${u.role} ${u.plan} ${u.companyName}`
          .toLowerCase()
          .includes(q);
      }),
    [allUsers, q]
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (!q) return true;
        return `${j.title} ${j.company} ${j.companyName} ${j.location} ${j.postedBy?.companyName}`
          .toLowerCase()
          .includes(q);
      }),
    [jobs, q]
  );

  const TABS = [
    {
      id: 'recruiters',
      label: 'Recruiters',
      icon: Building2,
      badge: recruiters.length,
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      badge: pendingPaymentsCount,
    },
    {
      id: 'users',
      label: 'All Users',
      icon: Users,
      badge: allUsers.length,
    },
    {
      id: 'jobs',
      label: 'Moderation',
      icon: Briefcase,
      badge: jobs.length,
    },
  ];

  return (
    <AppShell
      title="Admin Console"
      subtitle="Verify recruiters, approve payments, manage users & inspect job applicants"
      allowedRoles={['admin']}
    >
      {loading ? (
        <Spinner label="Loading platform telemetry..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Dark Admin Banner */}
          <div className="rounded-3xl bg-[#141418] text-white p-6 sm:p-7 border border-white/10 shadow-lifted flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-600/25 border border-coral-500/40 text-coral-200 text-xs font-bold mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-coral-500" />
                PLATFORM GOVERNANCE
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">
                CareerGuide AI Control Center
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 mt-1">
                {pendingRecruitersCount} pending recruiter
                {pendingRecruitersCount === 1 ? '' : 's'} •{' '}
                {pendingPaymentsCount} pending payment
                {pendingPaymentsCount === 1 ? '' : 's'} • {allUsers.length}{' '}
                registered users.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadAdminData}
              className="shrink-0 self-start lg:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh All
            </Button>
          </div>

          {/* 4-Card Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {pendingRecruitersCount}
                </p>
                <p className="text-xs font-medium text-muted">
                  Pending Recruiters ({recruiters.length} total)
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {pendingPaymentsCount}
                </p>
                <p className="text-xs font-medium text-muted">
                  Pending Payments ({payments.length} total)
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-tealbrand-50 text-tealbrand-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {allUsers.length}
                </p>
                <p className="text-xs font-medium text-muted">
                  Total Users ({jobSeekers.length} seekers)
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-ink text-white flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {jobs.length}
                </p>
                <p className="text-xs font-medium text-muted">Active Jobs</p>
              </div>
            </Card>
          </div>

          {/* Navigation Tabs & Search */}
          <Card className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setQuery('');
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-ink text-white shadow-sm'
                        : 'bg-canvas text-muted hover:text-ink border border-stone-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <span
                      className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] ${
                        active
                          ? 'bg-coral-600 text-white'
                          : 'bg-stone-200/80 text-ink'
                      }`}
                    >
                      {tab.badge}
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
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
              />
            </div>
          </Card>

          {/* TAB 1: RECRUITERS */}
          {activeTab === 'recruiters' && (
            <>
              {filteredRecruiters.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No recruiter accounts found"
                  description="Registered recruiters with company details and GSTIN will appear here for approval."
                />
              ) : (
                <div className="space-y-3.5">
                  {filteredRecruiters.map((rec) => {
                    const id = rec._id || rec.id;
                    const status = String(
                      rec.recruiterStatus || 'pending'
                    ).toLowerCase();
                    const validGstin = rec.gstin
                      ? GSTIN_REGEX.test(String(rec.gstin).toUpperCase())
                      : false;

                    return (
                      <Card
                        key={id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display font-semibold text-lg text-ink">
                              {rec.companyName || 'Unnamed Company'}
                            </h3>
                            <Badge
                              tone={
                                status === 'approved'
                                  ? 'teal'
                                  : status === 'rejected'
                                  ? 'rose'
                                  : 'amber'
                              }
                            >
                              {status.toUpperCase()}
                            </Badge>
                            {rec.gstin && (
                              <Badge tone={validGstin ? 'teal' : 'rose'}>
                                <FileBadge className="w-3 h-3" />
                                GSTIN: {rec.gstin}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted">
                            <strong className="text-ink">{rec.name}</strong> •{' '}
                            {rec.email}
                            {rec.createdAt
                              ? ` • Joined ${formatDate(rec.createdAt)}`
                              : ''}
                          </p>

                          {rec.companyWebsite && (
                            <a
                              href={
                                rec.companyWebsite.startsWith('http')
                                  ? rec.companyWebsite
                                  : `https://${rec.companyWebsite}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-coral-600 hover:text-coral-700"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              {rec.companyWebsite}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {status !== 'approved' && (
                            <Button
                              type="button"
                              variant="teal"
                              size="sm"
                              loading={busyId === id}
                              onClick={() =>
                                handleRecruiterAction(id, 'approved')
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </Button>
                          )}
                          {status !== 'rejected' && (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              loading={busyId === id}
                              onClick={() =>
                                handleRecruiterAction(id, 'rejected')
                              }
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === 'payments' && (
            <>
              {filteredPayments.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No payment requests yet"
                  description="Razorpay orders and manual UPI UTR submissions appear here."
                />
              ) : (
                <div className="space-y-3.5">
                  {filteredPayments.map((pay) => {
                    const id = pay._id || pay.id;
                    const status = String(pay.status || 'pending').toLowerCase();
                    const refCode =
                      pay.utr ||
                      pay.razorpayPaymentId ||
                      pay.razorpayOrderId ||
                      'N/A';
                    const refLabel = pay.utr
                      ? 'UTR'
                      : pay.razorpayPaymentId
                      ? 'RZP Pay'
                      : pay.razorpayOrderId
                      ? 'Order'
                      : 'Ref';

                    return (
                      <Card
                        key={id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs sm:text-sm font-bold text-ink bg-sand px-2.5 py-1 rounded-lg border border-stone-200 inline-flex items-center gap-1.5">
                              {refLabel}: {refCode}
                              {refCode !== 'N/A' && (
                                <button
                                  type="button"
                                  onClick={() => copyUtr(refCode)}
                                  className="text-muted hover:text-ink"
                                  title="Copy reference"
                                >
                                  {copiedUtr === refCode ? (
                                    <Check className="w-3.5 h-3.5 text-tealbrand-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </span>
                            <Badge
                              tone={
                                status === 'approved'
                                  ? 'teal'
                                  : status === 'rejected' || status === 'failed'
                                  ? 'rose'
                                  : 'amber'
                              }
                            >
                              {status.toUpperCase()}
                            </Badge>
                            <Badge tone="neutral">
                              <IndianRupee className="w-3 h-3" />
                              {pay.amount || 99}
                            </Badge>
                            {pay.paymentMethod && (
                              <Badge tone="neutral">
                                {pay.paymentMethod.toUpperCase()}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted">
                            <strong className="text-ink">
                              {pay.user?.name || 'User'}
                            </strong>{' '}
                            • {pay.user?.email || '—'}
                            {pay.createdAt && (
                              <span className="inline-flex items-center gap-1 ml-2">
                                <Clock className="w-3 h-3" />
                                {formatDate(pay.createdAt)}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {status === 'pending' ? (
                            <>
                              <Button
                                type="button"
                                variant="teal"
                                size="sm"
                                loading={busyId === id}
                                onClick={() =>
                                  handlePaymentAction(id, 'approved')
                                }
                              >
                                <Crown className="w-3.5 h-3.5" />
                                Activate PRO
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                loading={busyId === id}
                                onClick={() =>
                                  handlePaymentAction(id, 'rejected')
                                }
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-muted">
                              Processed
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 3: ALL USERS */}
          {activeTab === 'users' && (
            <Card className="overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-canvas border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-muted">
                        <th className="px-5 py-3.5">User</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Plan / Status</th>
                        <th className="px-5 py-3.5">Credits</th>
                        <th className="px-5 py-3.5">Joined</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                      {filteredUsers.map((u) => {
                        const uid = u._id || u.id;
                        return (
                          <tr
                            key={uid}
                            className="hover:bg-canvas/60 transition-colors"
                          >
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-ink">{u.name}</p>
                              <p className="text-xs text-muted">
                                {u.email}
                                {u.companyName ? ` • ${u.companyName}` : ''}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                tone={
                                  u.role === 'recruiter' ? 'coral' : 'neutral'
                                }
                              >
                                {u.role}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              {u.role === 'recruiter' ? (
                                <Badge
                                  tone={
                                    u.recruiterStatus === 'approved'
                                      ? 'teal'
                                      : u.recruiterStatus === 'rejected'
                                      ? 'rose'
                                      : 'amber'
                                  }
                                >
                                  {u.recruiterStatus || 'pending'}
                                </Badge>
                              ) : u.plan === 'premium' ? (
                                <Badge tone="amber">
                                  <Crown className="w-3 h-3" />
                                  Premium
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted">Free</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-ink">
                              {u.credits ?? 0}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted">
                              {formatDate(u.createdAt)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                disabled={busyId === uid}
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: JOBS MODERATION + APPLICANTS INSPECTOR */}
          {activeTab === 'jobs' && (
            <>
              {filteredJobs.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No jobs found"
                  description="Published job listings across the platform appear here with full applicant inspection."
                />
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job) => {
                    const jid = job._id || job.id;
                    const applicants = Array.isArray(job.applicants)
                      ? job.applicants
                      : [];
                    const isExpanded = expandedJobId === jid;

                    return (
                      <Card key={jid} className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display font-semibold text-base text-ink">
                                {job.title}
                              </h3>
                              <Badge
                                tone={applicants.length > 0 ? 'teal' : 'neutral'}
                              >
                                <UserCheck className="w-3 h-3" />
                                {applicants.length} Applicant
                                {applicants.length === 1 ? '' : 's'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted mt-1">
                              {job.company ||
                                job.companyName ||
                                job.postedBy?.companyName ||
                                'Company'}{' '}
                              • {job.location || 'Remote'} • {formatSalary(job)}{' '}
                              • {formatDate(job.createdAt)}
                              {job.postedBy?.name
                                ? ` • Posted by ${job.postedBy.name}`
                                : ''}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant={isExpanded ? 'dark' : 'secondary'}
                              size="sm"
                              onClick={() =>
                                setExpandedJobId(isExpanded ? null : jid)
                              }
                            >
                              {isExpanded ? (
                                <>
                                  Hide Applicants
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  Inspect Applicants ({applicants.length})
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </Button>

                            <Link href={`/jobs/${jid}`}>
                              <Button variant="secondary" size="sm">
                                Job Page
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>

                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              loading={busyId === jid}
                              onClick={() => handleDeleteJob(jid)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Applicants Inspector */}
                        {isExpanded && (
                          <div className="pt-4 border-t border-stone-100 space-y-2.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                              Applicants List ({applicants.length})
                            </p>

                            {applicants.length === 0 ? (
                              <p className="text-xs text-muted bg-canvas border border-stone-200 rounded-xl p-4">
                                No candidates have applied to this role yet.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {applicants.map((app, idx) => {
                                  const u = app.user || {};
                                  const uid = u._id || app._id || idx;
                                  const pct =
                                    typeof app.matchPercent === 'number'
                                      ? app.matchPercent
                                      : null;
                                  const tone =
                                    pct !== null ? getMatchTone(pct) : null;
                                  const resumeKey = `${jid}-${uid}`;

                                  return (
                                    <div
                                      key={uid}
                                      className="p-3.5 rounded-xl bg-canvas border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-bold text-ink">
                                            {u.name || 'Candidate'}
                                          </p>
                                          <Badge tone="neutral">
                                            {app.status || 'Applied'}
                                          </Badge>
                                          {tone && (
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${tone.badge}`}
                                            >
                                              {pct}% Match
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted mt-0.5">
                                          {u.email || '—'}
                                          {u.role ? ` • ${u.role}` : ''}
                                          {app.appliedAt
                                            ? ` • Applied ${formatDate(app.appliedAt)}`
                                            : ''}
                                        </p>
                                      </div>

                                      {u._id && (
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          loading={loadingResumeKey === resumeKey}
                                          onClick={() =>
                                            handleViewApplicantResume(u._id, jid)
                                          }
                                          className="shrink-0"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-coral-600" />
                                          View Resume
                                          <ExternalLink className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
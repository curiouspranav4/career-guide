'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Briefcase,
  Users,
  MapPin,
  Trash2,
  Send,
  Bell,
  Clock,
  ExternalLink,
  FileText,
  ShieldCheck,
  AlertCircle,
  Search,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import { useAuth } from '@/context/AuthContext';
import {
  addJob,
  getRecruiterJobs,
  deleteJob,
  updateApplicantStatus,
  postJobUpdate,
  getApplicantResume,
  resolveResumeUrl,
} from '@/lib/api';
import { formatSalary, formatDate, getMatchTone } from '@/lib/utils';

const CATEGORIES = [
  'Software Engineering',
  'Data & Analytics',
  'AI / Machine Learning',
  'UI/UX & Design',
  'Product Management',
  'DevOps & Cloud',
  'Finance & Banking',
  'Marketing & Growth',
  'HR & Operations',
  'Other',
];

// Matches backend/models/Job.js enum: ['fresher', 'junior', 'mid', 'senior']
const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher (0-1 yr)' },
  { value: 'junior', label: 'Junior (1-3 yrs)' },
  { value: 'mid', label: 'Mid-Level (3-5 yrs)' },
  { value: 'senior', label: 'Senior (5+ yrs)' },
];

// Matches backend/models/Job.js enum: ['full-time', 'part-time', 'internship', 'remote']
const JOB_TYPES = [
  { value: 'full-time', label: 'Full-Time' },
  { value: 'part-time', label: 'Part-Time' },
  { value: 'internship', label: 'Internship' },
  { value: 'remote', label: 'Remote' },
];

// Matches backend/models/Job.js enum: ['applied', 'shortlisted', 'interview', 'selected', 'rejected']
const APPLICANT_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
];

export default function RecruiterPage() {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState('listings');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const [posting, setPosting] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [updatingAppKey, setUpdatingAppKey] = useState(null);
  const [loadingResumeKey, setLoadingResumeKey] = useState(null);
  const [updateMsg, setUpdateMsg] = useState('');
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [applicantQuery, setApplicantQuery] = useState('');

  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    category: 'Software Engineering',
    experienceLevel: 'fresher',
    jobType: 'full-time',
    salaryLPA: '',
    salary: '',
    skillsInput: '',
    description: '',
  });

  useEffect(() => {
    if (user?.companyName && !form.company) {
      setForm((prev) => ({ ...prev, company: user.companyName }));
    }
  }, [user?.companyName, form.company]);

  const recruiterStatus = String(
    user?.recruiterStatus || 'pending'
  ).toLowerCase();
  const isApproved = recruiterStatus === 'approved';

  const loadJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getRecruiterJobs();
      const list = Array.isArray(data) ? data : [];
      setJobs(list);
      if (list.length > 0) {
        setSelectedJobId((prev) =>
          prev && list.some((j) => (j._id || j.id) === prev)
            ? prev
            : list[0]._id || list[0].id
        );
      } else {
        setSelectedJobId(null);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const selectedJob = useMemo(
    () => jobs.find((j) => (j._id || j.id) === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!isApproved) {
      toast.error('Your recruiter account is pending admin verification.');
      return;
    }

    const requiredSkills = form.skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const salaryNum = form.salaryLPA ? Number(form.salaryLPA) : 0;

    const payload = {
      title: form.title.trim(),
      company: (form.company || user?.companyName || 'Company').trim(),
      location: form.location.trim(),
      category: form.category,
      experienceLevel: form.experienceLevel,
      jobType: form.jobType,
      salaryLPA: salaryNum,
      salary:
        form.salary.trim() ||
        (salaryNum > 0 ? `${salaryNum} LPA` : 'Not Disclosed'),
      requiredSkills,
      description: form.description.trim(),
    };

    setPosting(true);
    try {
      const { data } = await addJob(payload);
      toast.success('Job published! Auto-Apply & matching candidates notified.');
      setForm({
        title: '',
        company: user?.companyName || form.company,
        location: '',
        category: 'Software Engineering',
        experienceLevel: 'fresher',
        jobType: 'full-time',
        salaryLPA: '',
        salary: '',
        skillsInput: '',
        description: '',
      });
      await loadJobs();
      if (data?._id) setSelectedJobId(data._id);
      setActiveTab('listings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish job.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job listing permanently?')) return;
    setDeletingJobId(jobId);
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => (j._id || j.id) !== jobId));
      if (selectedJobId === jobId) setSelectedJobId(null);
      toast.success('Job deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete job.');
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleStatusChange = async (applicantUserId, newStatus) => {
    if (!selectedJob || !applicantUserId) return;
    const jid = selectedJob._id || selectedJob.id;
    const cleanStatus = String(newStatus).toLowerCase();
    setUpdatingAppKey(applicantUserId);
    try {
      await updateApplicantStatus(jid, applicantUserId, cleanStatus);
      setJobs((prev) =>
        prev.map((j) =>
          (j._id || j.id) !== jid
            ? j
            : {
                ...j,
                applicants: (j.applicants || []).map((a) =>
                  String(a.user?._id || a.user) === String(applicantUserId)
                    ? { ...a, status: cleanStatus }
                    : a
                ),
              }
        )
      );
      const label =
        APPLICANT_STATUSES.find((s) => s.value === cleanStatus)?.label ||
        cleanStatus;
      toast.success(`Applicant marked as ${label}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to update applicant status.'
      );
    } finally {
      setUpdatingAppKey(null);
    }
  };

  const handleViewResume = async (userId, jobId) => {
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

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!selectedJob || !updateMsg.trim()) return;
    const jid = selectedJob._id || selectedJob.id;
    setSendingUpdate(true);
    try {
      await postJobUpdate(jid, updateMsg.trim());
      const newEntry = {
        message: updateMsg.trim(),
        createdAt: new Date().toISOString(),
      };
      setJobs((prev) =>
        prev.map((j) =>
          (j._id || j.id) === jid
            ? { ...j, updates: [...(j.updates || []), newEntry] }
            : j
        )
      );
      setUpdateMsg('');
      toast.success('Update broadcast to applicants!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post update.');
    } finally {
      setSendingUpdate(false);
    }
  };

  const totalApplicantsCount = useMemo(
    () =>
      jobs.reduce(
        (sum, j) =>
          sum + (Array.isArray(j.applicants) ? j.applicants.length : 0),
        0
      ),
    [jobs]
  );

  const filteredApplicants = useMemo(() => {
    const list = Array.isArray(selectedJob?.applicants)
      ? selectedJob.applicants
      : [];
    const q = applicantQuery.trim().toLowerCase();
    return list
      .filter((a) => {
        if (!q) return true;
        return `${a.user?.name} ${a.user?.email} ${a.status}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => (b.matchPercent ?? -1) - (a.matchPercent ?? -1));
  }, [selectedJob, applicantQuery]);

  return (
    <AppShell
      title="Recruiter Hub"
      subtitle="Manage your posted roles, review pre-scored applicants & broadcast updates"
      allowedRoles={['recruiter']}
    >
      {loading ? (
        <Spinner label="Loading your hiring workspace..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {!isApproved && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-sm text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Account Status: {recruiterStatus.toUpperCase()}
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    An admin is reviewing your company profile. Once approved,
                    you can publish new jobs immediately.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => refreshUser()}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Status
              </Button>
            </div>
          )}

          {/* Header Banner */}
          <div className="rounded-3xl bg-[#141418] text-white p-6 sm:p-7 border border-white/10 shadow-lifted flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-coral-600/20 blur-[100px]" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-stone-200">
                  <Building2 className="w-3.5 h-3.5 text-coral-500" />
                  {user?.companyName || 'Recruiter Workspace'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    isApproved
                      ? 'bg-tealbrand-600/25 border-tealbrand-600/40 text-tealbrand-100'
                      : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isApproved ? 'Verified Employer' : 'Pending Review'}
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">
                {jobs.length} My Posted Role{jobs.length === 1 ? '' : 's'} •{' '}
                <span className="text-coral-500">
                  {totalApplicantsCount} Applicant
                  {totalApplicantsCount === 1 ? '' : 's'}
                </span>
              </h2>
            </div>

            <div className="relative z-10 flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant={activeTab === 'listings' ? 'secondary' : 'dark'}
                size="md"
                onClick={() => setActiveTab('listings')}
              >
                <Briefcase className="w-4 h-4" />
                My Listings ({jobs.length})
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setActiveTab('post')}
              >
                <Plus className="w-4 h-4" />
                Post New Job
              </Button>
            </div>
          </div>

          {/* POST JOB FORM */}
          {activeTab === 'post' && (
            <Card className="p-6 sm:p-8 max-w-4xl">
              <h3 className="font-display text-2xl font-semibold text-ink mb-1">
                Publish a New Opening
              </h3>
              <p className="text-xs text-muted mb-6">
                Add clear required skills and LPA so matching Premium candidates
                get auto-applied automatically.
              </p>

              <form onSubmit={handlePostJob} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="e.g. Full-Stack Developer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.company}
                      onChange={(e) =>
                        setForm({ ...form, company: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      placeholder="e.g. Noida / Remote"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Job Type
                    </label>
                    <select
                      value={form.jobType}
                      onChange={(e) =>
                        setForm({ ...form, jobType: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                    >
                      {JOB_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Experience Level
                    </label>
                    <select
                      value={form.experienceLevel}
                      onChange={(e) =>
                        setForm({ ...form, experienceLevel: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                    >
                      {EXPERIENCE_LEVELS.map((lvl) => (
                        <option key={lvl.value} value={lvl.value}>
                          {lvl.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Salary (LPA Number)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={form.salaryLPA}
                      onChange={(e) =>
                        setForm({ ...form, salaryLPA: e.target.value })
                      }
                      placeholder="e.g. 10"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Display Salary (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.salary}
                      onChange={(e) =>
                        setForm({ ...form, salary: e.target.value })
                      }
                      placeholder="e.g. 8 - 12 LPA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                    Required Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.skillsInput}
                    onChange={(e) =>
                      setForm({ ...form, skillsInput: e.target.value })
                    }
                    placeholder="React, Node.js, MongoDB, Express"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                    Job Description *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Describe responsibilities, tech stack, and interview rounds..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setActiveTab('listings')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={posting}
                    disabled={!isApproved}
                  >
                    <Send className="w-4 h-4" />
                    Publish Job
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* LISTINGS + APPLICANTS */}
          {activeTab === 'listings' && (
            <>
              {jobs.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No jobs published yet"
                  description="Publish your first opening to start receiving AI skill-matched candidates."
                  action={
                    <Button
                      variant="primary"
                      onClick={() => setActiveTab('post')}
                    >
                      <Plus className="w-4 h-4" />
                      Post Your First Job
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-4 space-y-3">
                    {jobs.map((job) => {
                      const jid = job._id || job.id;
                      const active = jid === selectedJobId;
                      const appCount = Array.isArray(job.applicants)
                        ? job.applicants.length
                        : 0;

                      return (
                        <div
                          key={jid}
                          onClick={() => setSelectedJobId(jid)}
                          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                            active
                              ? 'bg-white border-coral-600 ring-1 ring-coral-600 shadow-lifted'
                              : 'bg-white border-stone-200 hover:border-stone-300 shadow-soft'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-display font-semibold text-base text-ink truncate">
                                {job.title}
                              </h3>
                              <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-coral-600" />
                                  {job.location || 'Remote'}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-ink">
                                  {formatSalary(job)}
                                </span>
                              </p>
                            </div>
                            <Badge tone={appCount > 0 ? 'teal' : 'neutral'}>
                              <Users className="w-3 h-3" />
                              {appCount}
                            </Badge>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(job.createdAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/jobs/${jid}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold text-ink hover:text-coral-600 inline-flex items-center gap-0.5"
                              >
                                View
                                <ArrowUpRight className="w-3 h-3" />
                              </Link>
                              <button
                                type="button"
                                disabled={deletingJobId === jid}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteJob(jid);
                                }}
                                className="p-1 text-muted hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-8 space-y-5">
                    {selectedJob && (
                      <>
                        <Card className="p-6 space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                            <div>
                              <h3 className="font-display font-semibold text-xl text-ink">
                                Applicants — {selectedJob.title}
                              </h3>
                              <p className="text-xs text-muted mt-0.5">
                                Ranked by resume skill match percentage
                              </p>
                            </div>

                            <div className="relative w-full sm:w-60">
                              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={applicantQuery}
                                onChange={(e) =>
                                  setApplicantQuery(e.target.value)
                                }
                                placeholder="Filter candidate..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-canvas border border-stone-200 text-xs text-ink"
                              />
                            </div>
                          </div>

                          {filteredApplicants.length === 0 ? (
                            <div className="rounded-2xl bg-canvas border border-dashed border-stone-300 p-8 text-center">
                              <Users className="w-7 h-7 text-muted mx-auto mb-2" />
                              <p className="text-sm font-semibold text-ink">
                                No applicants yet
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {filteredApplicants.map((app, idx) => {
                                const u = app.user || {};
                                const uid = u._id || idx;
                                const jid = selectedJob._id || selectedJob.id;
                                const pct =
                                  typeof app.matchPercent === 'number'
                                    ? app.matchPercent
                                    : null;
                                const tone =
                                  pct !== null ? getMatchTone(pct) : null;
                                const resumeKey = `${jid}-${uid}`;
                                const currentStatus = String(
                                  app.status || 'applied'
                                ).toLowerCase();

                                return (
                                  <div
                                    key={uid}
                                    className="p-4 rounded-2xl bg-canvas border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-ink truncate">
                                          {u.name || 'Candidate'}
                                        </p>
                                        {tone && (
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${tone.badge}`}
                                          >
                                            {pct}% Match
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted truncate">
                                        {u.email || '—'}
                                        {app.appliedAt
                                          ? ` • Applied ${formatDate(app.appliedAt)}`
                                          : ''}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                      {u._id && (
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          loading={loadingResumeKey === resumeKey}
                                          onClick={() =>
                                            handleViewResume(u._id, jid)
                                          }
                                        >
                                          <FileText className="w-3.5 h-3.5 text-coral-600" />
                                          Resume
                                          <ExternalLink className="w-3 h-3" />
                                        </Button>
                                      )}

                                      <select
                                        value={currentStatus}
                                        disabled={updatingAppKey === uid}
                                        onChange={(e) =>
                                          handleStatusChange(uid, e.target.value)
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-ink focus:outline-none focus:border-coral-600"
                                      >
                                        {APPLICANT_STATUSES.map((st) => (
                                          <option
                                            key={st.value}
                                            value={st.value}
                                          >
                                            {st.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>

                        {/* Broadcast Announcement */}
                        <Card className="p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display font-semibold text-base text-ink flex items-center gap-2">
                              <Bell className="w-4 h-4 text-coral-600" />
                              Post Announcement for Applicants
                            </h3>
                            <Badge tone="neutral">
                              {(selectedJob.updates || []).length} posted
                            </Badge>
                          </div>

                          <form
                            onSubmit={handlePostAnnouncement}
                            className="flex flex-col sm:flex-row gap-2.5"
                          >
                            <input
                              type="text"
                              value={updateMsg}
                              onChange={(e) => setUpdateMsg(e.target.value)}
                              placeholder="e.g. Technical rounds start Monday at 11 AM..."
                              className="flex-1 px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                            />
                            <Button
                              type="submit"
                              variant="dark"
                              loading={sendingUpdate}
                              disabled={!updateMsg.trim()}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Broadcast
                            </Button>
                          </form>

                          {Array.isArray(selectedJob.updates) &&
                            selectedJob.updates.length > 0 && (
                              <div className="space-y-2 pt-2">
                                {[...selectedJob.updates]
                                  .reverse()
                                  .slice(0, 4)
                                  .map((u, i) => (
                                    <div
                                      key={u._id || i}
                                      className="p-3 rounded-xl bg-canvas border border-stone-200/80 text-xs flex items-center justify-between gap-3"
                                    >
                                      <span className="text-ink">
                                        {u.message}
                                      </span>
                                      {u.createdAt && (
                                        <span className="text-muted shrink-0">
                                          {formatDate(u.createdAt)}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                        </Card>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
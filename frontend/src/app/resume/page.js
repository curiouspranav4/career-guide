'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileText,
  FileSearch,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Briefcase,
  MapPin,
  IndianRupee,
  ArrowUpRight,
  Mic,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import {
  getMyResumes,
  uploadResume,
  getAllJobs,
  resolveResumeUrl,
} from '@/lib/api';
import { formatSalary, formatDate, getMatchTone } from '@/lib/utils';

function getSkillsFromResume(resume) {
  if (!resume) return [];
  const list =
    resume.extractedSkills || resume.skills || resume.parsedSkills || [];
  return Array.isArray(list) ? list : [];
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

export default function ResumePage() {
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [resumes, setResumes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resumesRes, jobsRes] = await Promise.allSettled([
        getMyResumes(),
        getAllJobs(),
      ]);

      if (resumesRes.status === 'fulfilled') {
        const list = Array.isArray(resumesRes.value?.data)
          ? resumesRes.value.data
          : [];
        setResumes(list);
        if (list.length > 0) {
          setSelectedId((prev) => prev || list[0]._id || list[0].id);
        }
      }

      if (jobsRes.status === 'fulfilled') {
        setJobs(Array.isArray(jobsRes.value?.data) ? jobsRes.value.data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeResume = useMemo(() => {
    if (!resumes.length) return null;
    return resumes.find((r) => (r._id || r.id) === selectedId) || resumes[0];
  }, [resumes, selectedId]);

  const activeSkills = useMemo(
    () => getSkillsFromResume(activeResume),
    [activeResume]
  );

  const matchedJobs = useMemo(() => {
    if (!activeSkills.length || !jobs.length) return [];
    return jobs
      .map((job) => ({
        ...job,
        _match: computeJobMatch(job, activeSkills),
      }))
      .filter((j) => j._match.percent !== null)
      .sort((a, b) => (b._match.percent ?? 0) - (a._match.percent ?? 0))
      .slice(0, 6);
  }, [jobs, activeSkills]);

  const handleFileUpload = async (file) => {
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('Please upload a PDF file (.pdf only).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    try {
      const { data } = await uploadResume(formData);
      const uploaded = data?.resume || data;
      const skillCount = (
        data?.extractedSkills || getSkillsFromResume(uploaded)
      ).length;

      toast.success(
        skillCount > 0
          ? `Resume analyzed! ${skillCount} skills extracted.`
          : 'Resume uploaded successfully!'
      );

      await loadData();
      if (uploaded?._id) {
        setSelectedId(uploaded._id);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Failed to upload & parse resume. Please try another PDF.'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopySkills = async () => {
    if (!activeSkills.length) return;
    try {
      await navigator.clipboard.writeText(activeSkills.join(', '));
      setCopied(true);
      toast.success('Skills copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy skills.');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  const activeFileUrl = activeResume
    ? resolveResumeUrl(activeResume.fileUrl, activeResume.filePath)
    : '';

  return (
    <AppShell
      title="Resume AI Analyzer"
      subtitle="Upload your PDF resume for instant skill extraction and live job compatibility"
      allowedRoles={['job_seeker_fresher', 'job_seeker_experienced']}
    >
      {loading ? (
        <Spinner label="Loading your resume intelligence..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Upload Zone + Quick CTA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-8 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-coral-600" />
                    Upload PDF Resume
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Our parser extracts technical, data, finance &amp; business
                    skills automatically.
                  </p>
                </div>
                <Badge tone="teal">PDF • Max 10 MB</Badge>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  dragActive
                    ? 'border-coral-600 bg-coral-50/50'
                    : 'border-stone-300 bg-canvas hover:border-coral-500 hover:bg-coral-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />

                <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 shadow-soft text-coral-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5" />
                </div>

                <p className="text-sm font-semibold text-ink">
                  {uploading
                    ? 'Analyzing your PDF & extracting skills...'
                    : 'Drop your PDF resume here, or click to browse'}
                </p>
                <p className="text-xs text-muted mt-1">
                  Your latest uploaded resume powers Job Match %, Auto-Apply,
                  and AI Mock Interviews.
                </p>

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={uploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Parsing PDF...' : 'Choose PDF File'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Dark Side Promo Card */}
            <div className="lg:col-span-4 rounded-2xl bg-[#141418] text-white p-6 flex flex-col justify-between shadow-lifted border border-white/10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral-600/25 border border-coral-500/35 text-coral-200 text-[11px] font-bold mb-3">
                  <Sparkles className="w-3 h-3 text-coral-500" />
                  NEED A FRESH CV?
                </span>
                <h3 className="font-display text-xl font-semibold">
                  Build an ATS-ready resume in minutes
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mt-2">
                  Choose from 11 Classic &amp; Executive designer templates,
                  preview live, and export clean PDFs directly from your
                  browser.
                </p>
              </div>
              <div className="pt-5 space-y-2.5">
                <Link href="/resume-builder" className="block">
                  <Button variant="primary" size="md" className="w-full">
                    <FileText className="w-4 h-4" />
                    Open CV Builder
                  </Button>
                </Link>
                <Link href="/mock-interview" className="block">
                  <Button
                    variant="dark"
                    size="md"
                    className="w-full border border-white/15"
                  >
                    <Mic className="w-4 h-4 text-coral-500" />
                    Practice Resume Interview
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Active Resume Analysis & History */}
          {resumes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No resumes analyzed yet"
              description="Upload your first PDF resume above to detect skills and see which open roles match your profile best."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Active Resume Breakdown */}
              <Card className="lg:col-span-8 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="teal">
                        <CheckCircle2 className="w-3 h-3" />
                        Active Profile
                      </Badge>
                      {(activeResume?.uploadedAt || activeResume?.createdAt) && (
                        <span className="text-xs text-muted inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(
                            activeResume.uploadedAt || activeResume.createdAt
                          )}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-semibold text-xl text-ink mt-2 truncate">
                      {activeResume?.fileName || 'Uploaded Resume.pdf'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeFileUrl && (
                      <a
                        href={activeFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="secondary" size="sm">
                          View PDF
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopySkills}
                      disabled={!activeSkills.length}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-tealbrand-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Skills
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Extracted Skills */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-coral-600" />
                      Extracted Skills ({activeSkills.length})
                    </p>
                    <span className="text-xs font-semibold text-tealbrand-700">
                      {activeSkills.length >= 8
                        ? 'Strong keyword coverage'
                        : 'Tip: Add more role keywords'}
                    </span>
                  </div>

                  {activeSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 rounded-xl bg-tealbrand-50 text-tealbrand-700 border border-tealbrand-100 text-xs font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        No standard skills were detected from this PDF. Make
                        sure your resume is text-based (not a scanned image) and
                        includes a clear Skills section.
                      </span>
                    </div>
                  )}
                </div>

                {/* Extracted Text Preview */}
                {activeResume?.extractedText && (
                  <div className="pt-4 border-t border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                      Extracted Text Preview
                    </p>
                    <p className="text-xs text-muted bg-canvas border border-stone-200 rounded-xl p-3.5 line-clamp-4 font-mono leading-relaxed">
                      {activeResume.extractedText}
                    </p>
                  </div>
                )}
              </Card>

              {/* Upload History Sidebar */}
              <Card className="lg:col-span-4 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-base text-ink">
                    Uploaded Versions
                  </h3>
                  <Badge tone="neutral">{resumes.length}</Badge>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {resumes.map((res, idx) => {
                    const id = res._id || res.id;
                    const active =
                      (activeResume?._id || activeResume?.id) === id;
                    const count = getSkillsFromResume(res).length;

                    return (
                      <button
                        type="button"
                        key={id || idx}
                        onClick={() => setSelectedId(id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                          active
                            ? 'bg-coral-50/70 border-coral-500'
                            : 'bg-canvas border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-ink truncate">
                          {res.fileName || `Resume #${idx + 1}`}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {count} skills •{' '}
                          {formatDate(res.uploadedAt || res.createdAt)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Top Matched Roles For This Resume */}
          {matchedJobs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-xl text-ink flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-coral-600" />
                    Best Matching Jobs For Your Resume
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Instant compatibility based on your {activeSkills.length}{' '}
                    extracted skills
                  </p>
                </div>
                <Link
                  href="/jobs"
                  className="text-xs font-semibold text-coral-600 hover:text-coral-700"
                >
                  Explore all jobs →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchedJobs.map((job) => {
                  const id = job._id || job.id;
                  const tone = getMatchTone(job._match.percent);

                  return (
                    <Link key={id} href={`/jobs/${id}`} className="group">
                      <Card className="p-5 h-full hover:shadow-lifted hover:-translate-y-0.5 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="min-w-0">
                              <h4 className="font-display font-semibold text-base text-ink group-hover:text-coral-600 truncate">
                                {job.title}
                              </h4>
                              <p className="text-xs text-muted truncate">
                                {job.company || job.companyName || 'Company'}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${tone.badge}`}
                            >
                              {job._match.percent}%
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-3">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-coral-600" />
                              {job.location || 'Remote'}
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-ink">
                              <IndianRupee className="w-3.5 h-3.5 text-tealbrand-600" />
                              {formatSalary(job)}
                            </span>
                          </div>

                          {job._match.missing.length > 0 && (
                            <p className="text-[11px] text-coral-700 bg-coral-50 border border-coral-200/70 rounded-lg px-2.5 py-1.5">
                              Missing:{' '}
                              <strong>
                                {job._match.missing.slice(0, 3).join(', ')}
                              </strong>
                            </p>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-ink group-hover:text-coral-600">
                          <span>Inspect Skill Gap</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
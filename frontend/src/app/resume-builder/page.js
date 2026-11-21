'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Crown,
  Lock,
  Sparkles,
  User,
  Briefcase,
  GraduationCap,
  Code2,
  Wrench,
  RotateCcw,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import UpgradeModal from '@/components/features/UpgradeModal';
import { Button, Badge, Card } from '@/components/ui/UI';
import { useAuth } from '@/context/AuthContext';
import { getMyResumes } from '@/lib/api';

const STORAGE_KEY = 'careerguide_cv_builder_v1';

const TEMPLATES = [
  { id: 'classic-clean', name: 'Classic Clean', tier: 'free', accent: '#18181B', layout: 'top' },
  { id: 'minimal-editorial', name: 'Minimal Editorial', tier: 'free', accent: '#57534E', layout: 'centered' },
  { id: 'modern-coral', name: 'Modern Coral', tier: 'free', accent: '#D95D39', layout: 'top' },
  { id: 'tech-compact', name: 'Tech Compact', tier: 'free', accent: '#0F766E', layout: 'top' },
  { id: 'fresher-focus', name: 'Fresher Focus', tier: 'free', accent: '#2563EB', layout: 'centered' },
  { id: 'exec-slate', name: 'Executive Slate', tier: 'premium', accent: '#1E293B', layout: 'banner' },
  { id: 'sidebar-teal', name: 'Sidebar Teal', tier: 'premium', accent: '#0F766E', layout: 'sidebar' },
  { id: 'bold-header', name: 'Bold Dark Header', tier: 'premium', accent: '#D95D39', layout: 'banner' },
  { id: 'swiss-grid', name: 'Swiss Grid', tier: 'premium', accent: '#111827', layout: 'sidebar' },
  { id: 'ivy-serif', name: 'Ivy League Serif', tier: 'premium', accent: '#7C2D12', layout: 'serif' },
  { id: 'product-lead', name: 'Product Lead', tier: 'premium', accent: '#4F46E5', layout: 'sidebar' },
];

const DEFAULT_CV = {
  fullName: 'Aarav Sharma',
  headline: 'Full-Stack Software Developer',
  email: 'aarav.sharma@example.com',
  phone: '+91 98765 43210',
  location: 'Bengaluru, India',
  linkedin: 'linkedin.com/in/aaravsharma',
  github: 'github.com/aaravsharma',
  summary:
    'Results-driven Full-Stack Developer skilled in Next.js, React, Node.js, and MongoDB. Experienced in designing responsive SaaS interfaces, REST APIs, and AI-assisted workflows with a focus on performance and clean architecture.',
  skills: 'React, Next.js, JavaScript, Node.js, Express, MongoDB, Tailwind CSS, SQL, Git, REST APIs',
  certifications: 'AWS Cloud Practitioner • Meta Front-End Developer Certificate',
  experience: [
    {
      role: 'Software Developer Intern',
      company: 'TechNova Labs',
      duration: 'Jan 2026 – Present',
      bullets:
        'Built reusable Next.js App Router dashboards that reduced page load times by 35%.\nIntegrated Razorpay checkout and JWT role-based authentication across 10+ REST endpoints.',
    },
  ],
  projects: [
    {
      name: 'CareerGuide AI — Intelligent Job Portal',
      tech: 'Next.js, Express, MongoDB, Tailwind CSS',
      description:
        'Developed an end-to-end AI hiring platform featuring PDF resume skill parsing, voice mock interviews, and automated job matching for candidates and recruiters.',
    },
  ],
  education: [
    {
      degree: 'B.Tech in Computer Science & Engineering',
      institution: 'National Institute of Technology',
      year: '2022 – 2026',
      score: 'CGPA: 8.6 / 10',
    },
  ],
};

const EDITOR_TABS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'projects', label: 'Projects', icon: Code2 },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: Wrench },
];

export default function ResumeBuilderPage() {
  const { user, refreshUser } = useAuth();
  const isPremium = user?.plan === 'premium';
  const previewRef = useRef(null);

  const [cv, setCv] = useState(DEFAULT_CV);
  const [templateId, setTemplateId] = useState('modern-coral');
  const [activeTab, setActiveTab] = useState('personal');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [syncingSkills, setSyncingSkills] = useState(false);

  // Load autosaved draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setCv((prev) => ({ ...prev, ...parsed }));
        }
      } else if (user) {
        setCv((prev) => ({
          ...prev,
          fullName: user.name || prev.fullName,
          email: user.email || prev.email,
        }));
      }
    } catch {
      // Ignore storage error
    }
  }, [user]);

  // Autosave draft
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
    } catch {
      // Ignore storage quota error
    }
  }, [cv]);

  const activeTemplate =
    TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const isLockedTemplate = activeTemplate.tier === 'premium' && !isPremium;

  const updateField = (field, value) => {
    setCv((prev) => ({ ...prev, [field]: value }));
  };

  const updateListItem = (key, idx, field, value) => {
    setCv((prev) => {
      const copy = [...prev[key]];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, [key]: copy };
    });
  };

  const addListItem = (key, emptyObj) => {
    setCv((prev) => ({ ...prev, [key]: [...prev[key], emptyObj] }));
  };

  const removeListItem = (key, idx) => {
    setCv((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  const handleImportSkillsFromResume = async () => {
    setSyncingSkills(true);
    try {
      const { data } = await getMyResumes();
      const list = Array.isArray(data) ? data : data?.resumes || data?.data || [];
      const latest = list[0];
      const extracted =
        latest?.extractedSkills || latest?.skills || latest?.parsedSkills || [];
      if (!extracted.length) {
        toast.error('No uploaded resume skills found yet. Upload a PDF first.');
        return;
      }
      updateField('skills', extracted.join(', '));
      toast.success(`Imported ${extracted.length} skills from your resume!`);
    } catch {
      toast.error('Could not fetch uploaded resume skills.');
    } finally {
      setSyncingSkills(false);
    }
  };

  const handleExportPdf = () => {
    if (isLockedTemplate) {
      toast.error('Executive templates require Premium. Upgrade to export!');
      setUpgradeOpen(true);
      return;
    }

    if (!previewRef.current) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      toast.error('Please allow pop-ups in Chrome to export your PDF.');
      return;
    }

    const htmlContent = previewRef.current.innerHTML;
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${cv.fullName || 'Resume'} - CareerGuide AI</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #18181b; background: #fff; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const skillList = cv.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const accent = activeTemplate.accent;
  const isSerif = activeTemplate.layout === 'serif';
  const isSidebar = activeTemplate.layout === 'sidebar';
  const isBanner = activeTemplate.layout === 'banner';
  const isCentered = activeTemplate.layout === 'centered';

  return (
    <AppShell
      title="CV Builder"
      subtitle="11 Classic & Executive designer templates with instant live preview and PDF export"
      allowedRoles={['job_seeker_fresher', 'job_seeker_experienced']}
    >
      <div className="space-y-5 animate-fade-up">
        {/* Template Selector Strip */}
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-coral-600" />
              <span className="text-sm font-bold text-ink">
                Choose Template ({TEMPLATES.length})
              </span>
              <Badge tone={isLockedTemplate ? 'amber' : 'teal'}>
                {activeTemplate.name}
                {activeTemplate.tier === 'premium' ? ' • PRO' : ' • Free'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={syncingSkills}
                onClick={handleImportSkillsFromResume}
              >
                <Sparkles className="w-3.5 h-3.5 text-coral-600" />
                Sync Resume Skills
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCv(DEFAULT_CV);
                  toast.success('Reset to sample template data');
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Sample
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleExportPdf}
              >
                {isLockedTemplate ? (
                  <>
                    <Crown className="w-3.5 h-3.5" />
                    Unlock &amp; Export PDF
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download / Print PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {TEMPLATES.map((tpl) => {
              const selected = tpl.id === templateId;
              const locked = tpl.tier === 'premium' && !isPremium;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateId(tpl.id)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selected
                      ? 'bg-ink text-white border-ink shadow-sm'
                      : 'bg-canvas text-ink border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tpl.accent }}
                  />
                  <span>{tpl.name}</span>
                  {tpl.tier === 'premium' && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        selected
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {locked ? (
                        <Lock className="w-2.5 h-2.5" />
                      ) : (
                        <Crown className="w-2.5 h-2.5" />
                      )}
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Main 2-Column Split: Editor (Left) + Live A4 Preview (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Editor Panel */}
          <Card className="xl:col-span-5 p-5 space-y-5">
            {/* Section Tabs */}
            <div className="flex flex-wrap gap-1.5 pb-3 border-b border-stone-100">
              {EDITOR_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-coral-600 text-white shadow-sm'
                        : 'bg-canvas text-muted hover:text-ink border border-stone-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={cv.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                      Role Headline
                    </label>
                    <input
                      type="text"
                      value={cv.headline}
                      onChange={(e) => updateField('headline', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={cv.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={cv.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={cv.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      value={cv.linkedin}
                      onChange={(e) => updateField('linkedin', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                      GitHub / Portfolio
                    </label>
                    <input
                      type="text"
                      value={cv.github}
                      onChange={(e) => updateField('github', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                    Professional Summary
                  </label>
                  <textarea
                    rows={4}
                    value={cv.summary}
                    onChange={(e) => updateField('summary', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                  />
                </div>
              </div>
            )}

            {/* Experience Tab */}
            {activeTab === 'experience' && (
              <div className="space-y-4">
                {cv.experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-canvas border border-stone-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">
                        Experience #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeListItem('experience', idx)}
                        className="text-muted hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Job Title"
                        value={exp.role}
                        onChange={(e) =>
                          updateListItem('experience', idx, 'role', e.target.value)
                        }
                        className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) =>
                          updateListItem(
                            'experience',
                            idx,
                            'company',
                            e.target.value
                          )
                        }
                        className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Duration (e.g. Jan 2025 – Present)"
                      value={exp.duration}
                      onChange={(e) =>
                        updateListItem('experience', idx, 'duration', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                    />
                    <textarea
                      rows={3}
                      placeholder="Key achievements (one per line)"
                      value={exp.bullets}
                      onChange={(e) =>
                        updateListItem('experience', idx, 'bullets', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    addListItem('experience', {
                      role: '',
                      company: '',
                      duration: '',
                      bullets: '',
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Experience
                </Button>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                {cv.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-canvas border border-stone-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">
                        Project #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeListItem('projects', idx)}
                        className="text-muted hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={proj.name}
                      onChange={(e) =>
                        updateListItem('projects', idx, 'name', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Tech Stack (e.g. Next.js, Node.js, MongoDB)"
                      value={proj.tech}
                      onChange={(e) =>
                        updateListItem('projects', idx, 'tech', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                    />
                    <textarea
                      rows={3}
                      placeholder="Impact & key features"
                      value={proj.description}
                      onChange={(e) =>
                        updateListItem(
                          'projects',
                          idx,
                          'description',
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    addListItem('projects', {
                      name: '',
                      tech: '',
                      description: '',
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Project
                </Button>
              </div>
            )}

            {/* Education Tab */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                {cv.education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-canvas border border-stone-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">
                        Education #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeListItem('education', idx)}
                        className="text-muted hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Degree (e.g. B.Tech CSE)"
                      value={edu.degree}
                      onChange={(e) =>
                        updateListItem('education', idx, 'degree', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="College / University"
                      value={edu.institution}
                      onChange={(e) =>
                        updateListItem(
                          'education',
                          idx,
                          'institution',
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Years (2022 – 2026)"
                        value={edu.year}
                        onChange={(e) =>
                          updateListItem('education', idx, 'year', e.target.value)
                        }
                        className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="CGPA / %"
                        value={edu.score}
                        onChange={(e) =>
                          updateListItem('education', idx, 'score', e.target.value)
                        }
                        className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    addListItem('education', {
                      degree: '',
                      institution: '',
                      year: '',
                      score: '',
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Education
                </Button>
              </div>
            )}

            {/* Skills & Certifications Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                    Skills (Comma separated)
                  </label>
                  <textarea
                    rows={4}
                    value={cv.skills}
                    onChange={(e) => updateField('skills', e.target.value)}
                    placeholder="React, Next.js, Node.js, MongoDB, SQL, Python..."
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                    Certifications &amp; Achievements
                  </label>
                  <textarea
                    rows={3}
                    value={cv.certifications}
                    onChange={(e) =>
                      updateField('certifications', e.target.value)
                    }
                    placeholder="AWS Certified, Smart India Hackathon Finalist..."
                    className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Right Live A4 Preview Panel */}
          <div className="xl:col-span-7 space-y-3">
            {isLockedTemplate && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-amber-900">
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Previewing <strong>{activeTemplate.name}</strong> (Executive
                    Template). Upgrade to Premium to download/print it, or
                    switch to any of the 5 Free Classic templates.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => setUpgradeOpen(true)}
                  className="shrink-0"
                >
                  Upgrade ₹199
                </Button>
              </div>
            )}

            <div className="bg-stone-200/70 p-3 sm:p-5 rounded-3xl border border-stone-300/70 overflow-x-auto">
              {/* Printable Document Container */}
              <div
                ref={previewRef}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#18181b',
                  minHeight: '860px',
                  fontFamily: isSerif
                    ? 'Georgia, "Times New Roman", serif'
                    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                {isSidebar ? (
                  /* TWO-COLUMN SIDEBAR LAYOUT */
                  <div style={{ display: 'flex', minHeight: '860px' }}>
                    <div
                      style={{
                        width: '32%',
                        backgroundColor: accent,
                        color: '#ffffff',
                        padding: '28px 20px',
                      }}
                    >
                      <h1
                        style={{
                          fontSize: '22px',
                          fontWeight: 700,
                          margin: '0 0 4px 0',
                          lineHeight: 1.2,
                        }}
                      >
                        {cv.fullName || 'Your Name'}
                      </h1>
                      <p
                        style={{
                          fontSize: '12px',
                          opacity: 0.9,
                          margin: '0 0 20px 0',
                        }}
                      >
                        {cv.headline}
                      </p>

                      <div
                        style={{
                          fontSize: '11px',
                          lineHeight: 1.7,
                          borderTop: '1px solid rgba(255,255,255,0.25)',
                          paddingTop: '14px',
                          marginBottom: '20px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontSize: '10px',
                            marginBottom: '6px',
                            opacity: 0.85,
                          }}
                        >
                          Contact
                        </div>
                        {cv.email && <div>{cv.email}</div>}
                        {cv.phone && <div>{cv.phone}</div>}
                        {cv.location && <div>{cv.location}</div>}
                        {cv.linkedin && <div>{cv.linkedin}</div>}
                        {cv.github && <div>{cv.github}</div>}
                      </div>

                      {skillList.length > 0 && (
                        <div
                          style={{
                            borderTop: '1px solid rgba(255,255,255,0.25)',
                            paddingTop: '14px',
                            marginBottom: '20px',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              fontSize: '10px',
                              marginBottom: '8px',
                              opacity: 0.85,
                            }}
                          >
                            Skills
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '5px',
                            }}
                          >
                            {skillList.map((sk) => (
                              <span
                                key={sk}
                                style={{
                                  fontSize: '10px',
                                  backgroundColor: 'rgba(255,255,255,0.16)',
                                  padding: '3px 7px',
                                  borderRadius: '4px',
                                }}
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {cv.certifications && (
                        <div
                          style={{
                            borderTop: '1px solid rgba(255,255,255,0.25)',
                            paddingTop: '14px',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              fontSize: '10px',
                              marginBottom: '6px',
                              opacity: 0.85,
                            }}
                          >
                            Certifications
                          </div>
                          <p
                            style={{
                              fontSize: '11px',
                              lineHeight: 1.5,
                              margin: 0,
                              opacity: 0.92,
                            }}
                          >
                            {cv.certifications}
                          </p>
                        </div>
                      )}
                    </div>

                    <div style={{ width: '68%', padding: '28px 26px' }}>
                      {cv.summary && (
                        <div style={{ marginBottom: '18px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: `1.5px solid ${accent}`,
                              paddingBottom: '4px',
                              margin: '0 0 8px 0',
                            }}
                          >
                            Profile Summary
                          </h2>
                          <p
                            style={{
                              fontSize: '12px',
                              lineHeight: 1.55,
                              color: '#3f3f46',
                              margin: 0,
                            }}
                          >
                            {cv.summary}
                          </p>
                        </div>
                      )}

                      {cv.experience.length > 0 && (
                        <div style={{ marginBottom: '18px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: `1.5px solid ${accent}`,
                              paddingBottom: '4px',
                              margin: '0 0 10px 0',
                            }}
                          >
                            Experience
                          </h2>
                          {cv.experience.map((exp, idx) => (
                            <div key={idx} style={{ marginBottom: '12px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                }}
                              >
                                <span>
                                  {exp.role}
                                  {exp.company ? ` — ${exp.company}` : ''}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: '#71717a',
                                  }}
                                >
                                  {exp.duration}
                                </span>
                              </div>
                              <ul
                                style={{
                                  margin: '5px 0 0 16px',
                                  padding: 0,
                                  fontSize: '11.5px',
                                  lineHeight: 1.5,
                                  color: '#3f3f46',
                                }}
                              >
                                {exp.bullets
                                  .split('\n')
                                  .filter(Boolean)
                                  .map((line, i) => (
                                    <li key={i} style={{ marginBottom: '3px' }}>
                                      {line}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {cv.projects.length > 0 && (
                        <div style={{ marginBottom: '18px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: `1.5px solid ${accent}`,
                              paddingBottom: '4px',
                              margin: '0 0 10px 0',
                            }}
                          >
                            Projects
                          </h2>
                          {cv.projects.map((proj, idx) => (
                            <div key={idx} style={{ marginBottom: '10px' }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: '12.5px',
                                }}
                              >
                                {proj.name}
                                {proj.tech && (
                                  <span
                                    style={{
                                      fontWeight: 500,
                                      fontSize: '11px',
                                      color: '#71717a',
                                    }}
                                  >
                                    {' '}
                                    • {proj.tech}
                                  </span>
                                )}
                              </div>
                              <p
                                style={{
                                  fontSize: '11.5px',
                                  lineHeight: 1.5,
                                  color: '#3f3f46',
                                  margin: '3px 0 0 0',
                                }}
                              >
                                {proj.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {cv.education.length > 0 && (
                        <div>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: `1.5px solid ${accent}`,
                              paddingBottom: '4px',
                              margin: '0 0 10px 0',
                            }}
                          >
                            Education
                          </h2>
                          {cv.education.map((edu, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '8px',
                                fontSize: '12px',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {edu.degree}
                                </div>
                                <div style={{ color: '#52525b', fontSize: '11.5px' }}>
                                  {edu.institution}
                                  {edu.score ? ` • ${edu.score}` : ''}
                                </div>
                              </div>
                              <span style={{ color: '#71717a', fontSize: '11px' }}>
                                {edu.year}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* SINGLE-COLUMN TOP / BANNER / CENTERED / SERIF LAYOUT */
                  <div>
                    <div
                      style={{
                        backgroundColor: isBanner ? accent : '#ffffff',
                        color: isBanner ? '#ffffff' : '#18181b',
                        padding: isBanner ? '28px 34px' : '28px 34px 16px 34px',
                        textAlign: isCentered ? 'center' : 'left',
                        borderBottom: isBanner
                          ? 'none'
                          : `2px solid ${accent}`,
                      }}
                    >
                      <h1
                        style={{
                          fontSize: '26px',
                          fontWeight: 700,
                          margin: '0 0 4px 0',
                          color: isBanner ? '#ffffff' : accent,
                        }}
                      >
                        {cv.fullName || 'Your Name'}
                      </h1>
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          margin: '0 0 10px 0',
                          opacity: isBanner ? 0.92 : 0.78,
                        }}
                      >
                        {cv.headline}
                      </p>
                      <div
                        style={{
                          fontSize: '11px',
                          opacity: isBanner ? 0.9 : 0.75,
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: isCentered ? 'center' : 'flex-start',
                          gap: '10px',
                        }}
                      >
                        {cv.email && <span>{cv.email}</span>}
                        {cv.phone && <span>• {cv.phone}</span>}
                        {cv.location && <span>• {cv.location}</span>}
                        {cv.linkedin && <span>• {cv.linkedin}</span>}
                        {cv.github && <span>• {cv.github}</span>}
                      </div>
                    </div>

                    <div style={{ padding: '22px 34px 30px 34px' }}>
                      {cv.summary && (
                        <div style={{ marginBottom: '16px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: '1px solid #e4e4e7',
                              paddingBottom: '4px',
                              margin: '0 0 7px 0',
                            }}
                          >
                            Summary
                          </h2>
                          <p
                            style={{
                              fontSize: '12px',
                              lineHeight: 1.55,
                              color: '#3f3f46',
                              margin: 0,
                            }}
                          >
                            {cv.summary}
                          </p>
                        </div>
                      )}

                      {skillList.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: '1px solid #e4e4e7',
                              paddingBottom: '4px',
                              margin: '0 0 8px 0',
                            }}
                          >
                            Technical &amp; Core Skills
                          </h2>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                            }}
                          >
                            {skillList.map((sk) => (
                              <span
                                key={sk}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 9px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f4f4f5',
                                  color: '#18181b',
                                  fontWeight: 600,
                                }}
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {cv.experience.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: '1px solid #e4e4e7',
                              paddingBottom: '4px',
                              margin: '0 0 9px 0',
                            }}
                          >
                            Experience
                          </h2>
                          {cv.experience.map((exp, idx) => (
                            <div key={idx} style={{ marginBottom: '10px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                }}
                              >
                                <span>
                                  {exp.role}
                                  {exp.company ? ` — ${exp.company}` : ''}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: '#71717a',
                                  }}
                                >
                                  {exp.duration}
                                </span>
                              </div>
                              <ul
                                style={{
                                  margin: '4px 0 0 16px',
                                  padding: 0,
                                  fontSize: '11.5px',
                                  lineHeight: 1.5,
                                  color: '#3f3f46',
                                }}
                              >
                                {exp.bullets
                                  .split('\n')
                                  .filter(Boolean)
                                  .map((line, i) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>
                                      {line}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {cv.projects.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: '1px solid #e4e4e7',
                              paddingBottom: '4px',
                              margin: '0 0 9px 0',
                            }}
                          >
                            Projects
                          </h2>
                          {cv.projects.map((proj, idx) => (
                            <div key={idx} style={{ marginBottom: '9px' }}>
                              <div
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                }}
                              >
                                {proj.name}
                                {proj.tech && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      color: '#71717a',
                                    }}
                                  >
                                    {' '}
                                    | {proj.tech}
                                  </span>
                                )}
                              </div>
                              <p
                                style={{
                                  fontSize: '11.5px',
                                  lineHeight: 1.5,
                                  color: '#3f3f46',
                                  margin: '3px 0 0 0',
                                }}
                              >
                                {proj.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {cv.education.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: '1px solid #e4e4e7',
                              paddingBottom: '4px',
                              margin: '0 0 9px 0',
                            }}
                          >
                            Education
                          </h2>
                          {cv.education.map((edu, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '6px',
                                fontSize: '12px',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {edu.degree}
                                </div>
                                <div style={{ color: '#52525b', fontSize: '11.5px' }}>
                                  {edu.institution}
                                  {edu.score ? ` • ${edu.score}` : ''}
                                </div>
                              </div>
                              <span style={{ color: '#71717a', fontSize: '11px' }}>
                                {edu.year}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {cv.certifications && (
                        <div>
                          <h2
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: accent,
                              borderBottom: '1px solid #e4e4e7',
                              paddingBottom: '4px',
                              margin: '0 0 7px 0',
                            }}
                          >
                            Certifications &amp; Achievements
                          </h2>
                          <p
                            style={{
                              fontSize: '11.5px',
                              color: '#3f3f46',
                              margin: 0,
                              lineHeight: 1.5,
                            }}
                          >
                            {cv.certifications}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onUpgraded={refreshUser}
      />
    </AppShell>
  );
}
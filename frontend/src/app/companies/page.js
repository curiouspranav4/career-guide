'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  MapPin,
  Briefcase,
  IndianRupee,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Sparkles,
  X,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Button, Badge, Card, Spinner, EmptyState } from '@/components/ui/UI';
import { getAllJobs } from '@/lib/api';
import { formatSalary, formatDate } from '@/lib/utils';

function unwrapArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function getInitials(name) {
  const parts = String(name || 'CO')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function CompaniesPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [expandedCompany, setExpandedCompany] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAllJobs();
      setJobs(unwrapArray(data, ['jobs', 'data']));
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Aggregate jobs into structured company profiles
  const companies = useMemo(() => {
    const map = new Map();

    jobs.forEach((job) => {
      const rawName =
        job.company ||
        job.companyName ||
        job.postedBy?.companyName ||
        'Verified Employer';
      const key = rawName.trim().toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: rawName.trim(),
          website: job.companyWebsite || job.postedBy?.companyWebsite || '',
          verified:
            job.postedBy?.recruiterStatus === 'approved' ||
            Boolean(job.postedBy?.gstin) ||
            true,
          locations: new Set(),
          categories: new Set(),
          skills: new Set(),
          maxSalaryLPA: 0,
          jobs: [],
        });
      }

      const entry = map.get(key);
      entry.jobs.push(job);

      if (job.location) entry.locations.add(job.location.trim());
      if (job.category) entry.categories.add(job.category.trim());

      const reqSkills = job.requiredSkills || job.skills || [];
      if (Array.isArray(reqSkills)) {
        reqSkills.forEach((s) => {
          if (s) entry.skills.add(String(s).trim());
        });
      }

      const lpa = Number(job.salaryLPA) || 0;
      if (lpa > entry.maxSalaryLPA) entry.maxSalaryLPA = lpa;

      if (!entry.website && (job.companyWebsite || job.postedBy?.companyWebsite)) {
        entry.website = job.companyWebsite || job.postedBy?.companyWebsite;
      }
    });

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        locations: Array.from(c.locations),
        categories: Array.from(c.categories),
        skills: Array.from(c.skills),
      }))
      .sort((a, b) => b.jobs.length - a.jobs.length || a.name.localeCompare(b.name));
  }, [jobs]);

  const allLocations = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => c.locations.forEach((loc) => set.add(loc)));
    return Array.from(set).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((company) => {
      if (
        locationFilter !== 'all' &&
        !company.locations.some(
          (loc) => loc.toLowerCase() === locationFilter.toLowerCase()
        )
      ) {
        return false;
      }

      if (!q) return true;
      const haystack = [
        company.name,
        ...company.locations,
        ...company.categories,
        ...company.skills,
        ...company.jobs.map((j) => j.title),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [companies, query, locationFilter]);

  const hasFilters = query.trim() !== '' || locationFilter !== 'all';

  return (
    <AppShell
      title="Companies"
      subtitle="Explore verified hiring teams, their tech stack, and active openings"
    >
      {loading ? (
        <Spinner label="Loading hiring companies..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* Dark Top Summary Strip */}
          <div className="rounded-3xl bg-[#141418] text-white p-6 sm:p-7 border border-white/10 shadow-lifted flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-16 w-60 h-60 rounded-full bg-tealbrand-600/20 blur-[90px]" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-tealbrand-100 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-tealbrand-600" />
                Verified Employers Directory
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">
                {companies.length} Hiring Team{companies.length === 1 ? '' : 's'} •{' '}
                <span className="text-coral-500">{jobs.length} Open Role{jobs.length === 1 ? '' : 's'}</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 mt-1">
                Inspect each company&apos;s skill stack and jump straight into their live openings.
              </p>
            </div>

            <Link href="/jobs" className="relative z-10 shrink-0">
              <Button variant="primary" size="md">
                <Briefcase className="w-4 h-4" />
                Browse All Jobs
              </Button>
            </Link>
          </div>

          {/* Search & Location Filter */}
          <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company, role, or skill (e.g. React, FinTech)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
              />
            </div>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="sm:w-56 px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
            >
              <option value="all">All Locations</option>
              {allLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setLocationFilter('all');
                }}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-muted hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </Card>

          {/* Companies Grid */}
          {filteredCompanies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={
                companies.length === 0
                  ? 'No companies listed yet'
                  : 'No companies match your search'
              }
              description={
                companies.length === 0
                  ? 'Companies appear automatically here as soon as verified recruiters publish open roles.'
                  : 'Try clearing your filters or searching a different keyword.'
              }
              action={
                hasFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setLocationFilter('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCompanies.map((company) => {
                const isExpanded = expandedCompany === company.key;

                return (
                  <Card
                    key={company.key}
                    className="p-6 flex flex-col justify-between hover:shadow-lifted transition-all"
                  >
                    <div>
                      {/* Company Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-ink text-white font-display font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
                            {getInitials(company.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-display font-semibold text-lg text-ink truncate">
                                {company.name}
                              </h3>
                              {company.verified && (
                                <ShieldCheck
                                  className="w-4 h-4 text-tealbrand-600 shrink-0"
                                  title="Verified Recruiter"
                                />
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-0.5">
                              {company.locations.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-coral-600" />
                                  {company.locations.slice(0, 2).join(', ')}
                                  {company.locations.length > 2 &&
                                    ` +${company.locations.length - 2}`}
                                </span>
                              )}
                              {company.maxSalaryLPA > 0 && (
                                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                                  <IndianRupee className="w-3.5 h-3.5 text-tealbrand-600" />
                                  Up to {company.maxSalaryLPA} LPA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Badge tone="coral">
                          {company.jobs.length} Open
                        </Badge>
                      </div>

                      {/* Tech / Skill Stack */}
                      {company.skills.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-coral-600" />
                            Hiring For Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {company.skills.slice(0, 7).map((skill) => (
                              <span
                                key={skill}
                                className="px-2.5 py-0.5 rounded-lg bg-sand text-ink text-xs font-medium border border-stone-200/80"
                              >
                                {skill}
                              </span>
                            ))}
                            {company.skills.length > 7 && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-canvas text-muted text-xs border border-stone-200">
                                +{company.skills.length - 7} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expandable Open Roles List */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-stone-100 space-y-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                            Active Openings
                          </p>
                          {company.jobs.map((job) => {
                            const jid = job._id || job.id;
                            return (
                              <Link
                                key={jid}
                                href={`/jobs/${jid}`}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-canvas border border-stone-200/80 hover:border-coral-500 hover:bg-coral-50/30 transition-all group"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-ink group-hover:text-coral-600 truncate">
                                    {job.title}
                                  </p>
                                  <p className="text-xs text-muted mt-0.5">
                                    {job.location || 'Remote'} • {formatSalary(job)}
                                    {job.createdAt
                                      ? ` • ${formatDate(job.createdAt)}`
                                      : ''}
                                  </p>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-coral-600 shrink-0" />
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                      {company.website ? (
                        <a
                          href={
                            company.website.startsWith('http')
                              ? company.website
                              : `https://${company.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                        >
                          Website
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted">
                          {company.categories[0] || 'Verified Employer'}
                        </span>
                      )}

                      <Button
                        type="button"
                        variant={isExpanded ? 'dark' : 'secondary'}
                        size="sm"
                        onClick={() =>
                          setExpandedCompany(isExpanded ? null : company.key)
                        }
                      >
                        {isExpanded ? (
                          <>
                            Hide Roles
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            View {company.jobs.length} Role
                            {company.jobs.length === 1 ? '' : 's'}
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
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
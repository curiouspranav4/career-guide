import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatSalary(job) {
  if (!job) return 'Not Disclosed';
  if (job.salaryLPA && Number(job.salaryLPA) > 0) {
    return `${job.salaryLPA} LPA`;
  }
  if (job.salary && job.salary !== 'Not Disclosed') {
    return job.salary;
  }
  return 'Not Disclosed';
}

export function getMatchTone(percent) {
  if (percent >= 75) {
    return {
      badge: 'bg-tealbrand-50 text-tealbrand-700 border-tealbrand-100',
      bar: 'bg-tealbrand-600',
      text: 'text-tealbrand-700',
      panel: 'bg-tealbrand-50/70 border-tealbrand-100',
    };
  }
  if (percent >= 50) {
    return {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      panel: 'bg-amber-50/70 border-amber-200',
    };
  }
  return {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-rose-500',
    text: 'text-rose-700',
    panel: 'bg-rose-50/70 border-rose-200',
  };
}
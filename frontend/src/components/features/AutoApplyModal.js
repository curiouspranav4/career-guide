'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Crown,
  MapPin,
  IndianRupee,
  Sliders,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCredits, updateAutoApply } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button, Spinner } from '@/components/ui/UI';

const POPULAR_CITIES = [
  'Remote',
  'Noida',
  'Delhi',
  'Gurugram',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Chennai',
];

export default function AutoApplyModal({
  open,
  onClose,
  onSaved,
  onOpenUpgrade,
}) {
  const { user, refreshUser } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [fetching, setFetching] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(75);
  const [minExpectedSalary, setMinExpectedSalary] = useState(0);
  const [locationsInput, setLocationsInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !isPremium) return;
    let mounted = true;
    setFetching(true);
    getCredits()
      .then(({ data }) => {
        if (!mounted || !data) return;
        setAutoApplyEnabled(Boolean(data.autoApplyEnabled));
        setAutoApplyThreshold(Number(data.autoApplyThreshold ?? 75));
        setMinExpectedSalary(Number(data.minExpectedSalary ?? 0));
        setLocationsInput(
          Array.isArray(data.preferredLocations)
            ? data.preferredLocations.join(', ')
            : ''
        );
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setFetching(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, isPremium]);

  if (!open) return null;

  const parseLocations = () =>
    locationsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

  const toggleCityChip = (city) => {
    const current = parseLocations();
    const exists = current.some(
      (c) => c.toLowerCase() === city.toLowerCase()
    );
    const updated = exists
      ? current.filter((c) => c.toLowerCase() !== city.toLowerCase())
      : [...current, city];
    setLocationsInput(updated.join(', '));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isPremium) {
      toast.error('Auto-Apply requires a Premium plan.');
      return;
    }

    const preferredLocations = parseLocations();
    setSaving(true);
    try {
      const payload = {
        autoApplyEnabled,
        autoApplyThreshold: Number(autoApplyThreshold) || 75,
        preferredLocations,
        minExpectedSalary: Number(minExpectedSalary) || 0,
      };
      const { data } = await updateAutoApply(payload);
      await refreshUser();
      toast.success(
        autoApplyEnabled
          ? 'Smart Auto-Apply is now ACTIVE!'
          : 'Auto-Apply settings saved (paused).'
      );
      if (onSaved) onSaved(data || payload);
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to save Auto-Apply settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCities = parseLocations().map((c) => c.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg max-h-[88vh] flex flex-col bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden animate-fade-up">
        <div className="shrink-0 bg-ink text-white px-5 py-4 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-tealbrand-600/30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tealbrand-600/25 border border-tealbrand-600/40 text-tealbrand-100 text-[11px] font-bold mb-2">
            <Zap className="w-3 h-3 text-tealbrand-600" />
            SMART AUTO-APPLY
          </div>
          <h2 className="font-display text-xl font-semibold">
            Automate your applications
          </h2>
          <p className="text-xs text-stone-300 mt-0.5">
            Uses 50 credits per automatic application whenever a matching role is
            posted.
          </p>
        </div>

        {!isPremium ? (
          <div className="overflow-y-auto p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink">
              Premium Feature Locked
            </h3>
            <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
              Upgrade to CareerGuide Premium (₹99) to unlock 1,000 monthly
              credits and 24/7 Smart Auto-Apply with Location, Match %, and
              Salary LPA filters.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button variant="secondary" onClick={onClose}>
                Maybe Later
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  if (onOpenUpgrade) onOpenUpgrade();
                }}
              >
                <Crown className="w-4 h-4" />
                Unlock Premium ₹99
              </Button>
            </div>
          </div>
        ) : fetching ? (
          <div className="p-6">
            <Spinner label="Loading your preferences..." />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-canvas border border-stone-200">
                <div>
                  <p className="text-sm font-bold text-ink">
                    Enable Smart Auto-Apply
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {autoApplyEnabled
                      ? 'Active — applying to matching new roles'
                      : 'Paused — toggle on to start auto-applying'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoApplyEnabled}
                  onClick={() => setAutoApplyEnabled((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    autoApplyEnabled ? 'bg-tealbrand-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
                      autoApplyEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-coral-600" />
                    Minimum Skill Match
                  </label>
                  <span className="font-mono text-xs font-bold text-coral-600 bg-coral-50 px-2.5 py-0.5 rounded-lg border border-coral-200">
                    {autoApplyThreshold}%+
                  </span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={95}
                  step={5}
                  value={autoApplyThreshold}
                  onChange={(e) => setAutoApplyThreshold(Number(e.target.value))}
                  className="w-full accent-coral-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted font-mono">
                  <span>40%</span>
                  <span>75% (Recommended)</span>
                  <span>95%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-tealbrand-600" />
                  Minimum Expected Salary (LPA)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={minExpectedSalary}
                  onChange={(e) => setMinExpectedSalary(e.target.value)}
                  placeholder="0 for any salary"
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-coral-600" />
                  Preferred Locations (Comma separated)
                </label>
                <input
                  type="text"
                  value={locationsInput}
                  onChange={(e) => setLocationsInput(e.target.value)}
                  placeholder="e.g. Noida, Bengaluru, Remote (empty = all cities)"
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {POPULAR_CITIES.map((city) => {
                    const active = selectedCities.includes(city.toLowerCase());
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => toggleCityChip(city)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-tealbrand-50 text-tealbrand-700 border-tealbrand-200'
                            : 'bg-canvas text-muted border-stone-200 hover:text-ink'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-stone-100 bg-white">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                <CheckCircle2 className="w-4 h-4" />
                Save Preferences
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
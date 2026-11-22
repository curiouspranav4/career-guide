'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const [mounted, setMounted] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(75);
  const [minExpectedSalary, setMinExpectedSalary] = useState(0);
  const [locationsInput, setLocationsInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background page scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isPremium) return;
    let active = true;
    setFetching(true);
    getCredits()
      .then(({ data }) => {
        if (!active || !data) return;
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
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [open, isPremium]);

  if (!open || !mounted) return null;

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

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        className="bg-ink/60 backdrop-blur-sm"
        style={{ position: 'fixed', inset: 0 }}
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="bg-white rounded-2xl border border-stone-200 shadow-2xl"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Fixed Header */}
        <div
          className="bg-ink text-white px-5 py-3.5 relative"
          style={{ flexShrink: 0, overflow: 'hidden' }}
        >
          <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-tealbrand-600/30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tealbrand-600/25 border border-tealbrand-600/40 text-tealbrand-100 text-[10px] font-bold mb-1.5">
            <Zap className="w-3 h-3 text-tealbrand-600" />
            SMART AUTO-APPLY
          </div>
          <h2 className="font-display text-lg font-semibold leading-tight">
            Automate your applications
          </h2>
          <p className="text-[11px] text-stone-300 mt-0.5">
            Uses 50 credits per automatic application whenever a matching role is
            posted.
          </p>
        </div>

        {!isPremium ? (
          <div
            className="p-5 text-center space-y-3"
            style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink">
              Premium Feature Locked
            </h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              Upgrade to CareerGuide Premium (₹99) to unlock 1,000 monthly
              credits and 24/7 Smart Auto-Apply with Location, Match %, and
              Salary LPA filters.
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-1">
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
          <form
            onSubmit={handleSave}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {/* Scrollable Body */}
            <div
              className="px-5 py-3.5 space-y-3.5"
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                minHeight: 0,
                overscrollBehavior: 'contain',
              }}
            >
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-stone-200">
                <div>
                  <p className="text-sm font-bold text-ink">
                    Enable Smart Auto-Apply
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
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
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    autoApplyEnabled ? 'bg-tealbrand-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      autoApplyEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Match Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-coral-600" />
                    Minimum Skill Match
                  </label>
                  <span className="font-mono text-xs font-bold text-coral-600 bg-coral-50 px-2 py-0.5 rounded-md border border-coral-200">
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
                <div className="flex justify-between text-[10px] text-muted font-mono">
                  <span>40%</span>
                  <span>75% (Recommended)</span>
                  <span>95%</span>
                </div>
              </div>

              {/* Minimum Salary */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1 flex items-center gap-1.5">
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
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                />
              </div>

              {/* Preferred Locations */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-coral-600" />
                  Preferred Locations (Comma separated)
                </label>
                <input
                  type="text"
                  value={locationsInput}
                  onChange={(e) => setLocationsInput(e.target.value)}
                  placeholder="e.g. Noida, Bengaluru, Remote (empty = all)"
                  className="w-full px-3 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {POPULAR_CITIES.map((city) => {
                    const active = selectedCities.includes(city.toLowerCase());
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => toggleCityChip(city)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
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

            {/* Fixed Footer */}
            <div
              className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-stone-100 bg-white"
              style={{ flexShrink: 0 }}
            >
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

  return createPortal(modalContent, document.body);
}
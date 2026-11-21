'use client';

import React, { useState } from 'react';
import {
  X,
  Crown,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  submitPaymentRequest,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/UI';

const BENEFITS = [
  '1,000 monthly credits (20x more than Free plan)',
  'Smart Auto-Apply with Location, Match % & Salary LPA filters',
  'Unlock all 11 Classic + Executive CV templates',
  '10 AI Voice & Live-Code Mock Interviews per day',
];

export default function UpgradeModal({ open, onClose, onUpgraded }) {
  const { user, updateUser, refreshUser } = useAuth();
  const [paying, setPaying] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [utr, setUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);

  if (!open) return null;

  const handleRazorpayCheckout = async () => {
    setPaying(true);
    try {
      const { data } = await createRazorpayOrder();
      const orderId = data.orderId || data.order?.id || data.id;
      const amount = data.amount || 9900;
      const currency = data.currency || 'INR';
      const razorpayKey =
        data.keyId ||
        data.key ||
        data.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (typeof window === 'undefined' || !window.Razorpay) {
        toast.error(
          'Razorpay script is still loading. Please try again or use manual UPI UTR below.'
        );
        setShowManual(true);
        return;
      }

      if (!razorpayKey || !orderId) {
        toast.error('Online checkout is unavailable right now. Use UPI UTR below.');
        setShowManual(true);
        return;
      }

      const options = {
        key: razorpayKey,
        amount,
        currency,
        name: 'CareerGuide AI',
        description: 'Premium Plan — 1,000 Credits + Auto-Apply',
        order_id: orderId,
        prefill: {
          name: data.prefill?.name || user?.name || '',
          email: data.prefill?.email || user?.email || '',
        },
        theme: { color: '#D95D39' },
        handler: async function (response) {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            updateUser({ plan: 'premium', credits: 1000 });
            await refreshUser();
            toast.success('Payment verified! Welcome to CareerGuide Premium.');
            if (onUpgraded) onUpgraded();
            onClose();
          } catch (verifyErr) {
            toast.error(
              verifyErr.response?.data?.message ||
                'Payment received, but verification failed.'
            );
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        toast.error(resp.error?.description || 'Payment failed. Try again.');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Could not start Razorpay checkout. You can submit a manual UPI UTR below.';
      toast.error(msg);
      setShowManual(true);
    } finally {
      setPaying(false);
    }
  };

  const handleManualUtrSubmit = async (e) => {
    e.preventDefault();
    const cleanUtr = utr.trim();
    if (cleanUtr.length < 10) {
      toast.error('Please enter a valid UPI UTR / Transaction ID (min 10 chars).');
      return;
    }

    setSubmittingUtr(true);
    try {
      const { data } = await submitPaymentRequest(cleanUtr);
      toast.success(
        data?.message ||
          'Payment request submitted! Admin will verify and activate Premium shortly.'
      );
      setUtr('');
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to submit payment request.'
      );
    } finally {
      setSubmittingUtr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden animate-fade-up">
        <div className="bg-ink text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-coral-600/30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-600/25 border border-coral-500/40 text-coral-200 text-xs font-bold mb-3">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            CAREERGUIDE PREMIUM
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">
            Put your job hunt on autopilot
          </h2>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-3xl font-bold text-white">₹99</span>
            <span className="text-xs text-stone-400">
              instant activation • 1,000 monthly credits
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          <ul className="space-y-2.5">
            {BENEFITS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-ink"
              >
                <span className="w-5 h-5 rounded-full bg-tealbrand-50 text-tealbrand-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={handleRazorpayCheckout}
              loading={paying}
              size="lg"
              className="w-full"
            >
              <CreditCard className="w-4 h-4" />
              Pay ₹99 Instantly via Razorpay
            </Button>

            <button
              type="button"
              onClick={() => setShowManual((prev) => !prev)}
              className="w-full text-center text-xs font-semibold text-muted hover:text-ink py-1 transition-colors"
            >
              {showManual
                ? 'Hide manual UPI UTR option'
                : 'Paid via UPI directly? Submit UTR for manual approval'}
            </button>
          </div>

          {showManual && (
            <form
              onSubmit={handleManualUtrSubmit}
              className="rounded-2xl bg-sand/70 border border-stone-200 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-ink">
                <Smartphone className="w-4 h-4 text-coral-600" />
                Manual UPI Verification
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Transfer <strong className="text-ink">₹99</strong> via any UPI
                app and paste your 12-digit UTR number below. Admin will approve
                it from the Payments panel.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="Enter 12-digit UTR number"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-sm font-mono text-ink placeholder:text-stone-400 focus:outline-none focus:border-coral-600"
                />
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  loading={submittingUtr}
                >
                  Submit
                </Button>
              </div>
            </form>
          )}

          <div className="flex items-center justify-center gap-4 pt-2 border-t border-stone-100 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-tealbrand-600" />
              Secure Razorpay Checkout
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-coral-600" />
              Instant PRO Badge Sync
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
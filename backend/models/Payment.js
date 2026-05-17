const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── OLD fields (UTR manual flow) — kept for historical records ──────────────
  utr: { type: String, default: '' },

  // ── NEW: Razorpay fields ────────────────────────────────────────────────────
  razorpayOrderId: { type: String, default: '' },    // order_xxx — backend creates
  razorpayPaymentId: { type: String, default: '' },  // pay_xxx  — razorpay returns
  razorpaySignature: { type: String, default: '' },  // signature for verification
  // ────────────────────────────────────────────────────────────────────────────

  amount: { type: Number, default: 99 },
  currency: { type: String, default: 'INR' },

  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'failed'], 
    default: 'pending' 
  },

  // 'razorpay' = automated, 'manual' = old UTR flow
  paymentMethod: { type: String, enum: ['razorpay', 'manual'], default: 'razorpay' },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
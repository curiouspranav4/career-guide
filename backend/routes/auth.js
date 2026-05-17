const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Validate GSTIN format (15 char alphanumeric)
const isValidGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, companyName, companyWebsite, designation, gstin } = req.body;

    if (role === 'admin') return res.status(403).json({ message: 'Admin registration not allowed' });

    const allowedRoles = ['job_seeker_fresher', 'job_seeker_experienced', 'recruiter'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    if (role === 'recruiter' && gstin) {
      if (!isValidGSTIN(gstin.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid GSTIN format' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { 
      name, email, password: hashedPassword, role,
      plan: 'free', credits: 50
    };
    
    if (role === 'recruiter') {
      userData.companyName = companyName || '';
      userData.companyWebsite = companyWebsite || '';
      userData.designation = designation || '';
      userData.gstin = gstin ? gstin.toUpperCase() : '';
      userData.isVerified = gstin ? isValidGSTIN(gstin.toUpperCase()) : false;
      userData.recruiterStatus = 'pending';
    }

    const user = new User(userData);
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: user.role, plan: user.plan, credits: user.credits } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Reset credits monthly
    const lastReset = new Date(user.creditsLastReset);
    const now = new Date();
    const diffDays = (now - lastReset) / (1000 * 60 * 60 * 24);
    if (diffDays >= 30) {
      user.credits = user.plan === 'premium' ? 1000 : 50;
      user.creditsLastReset = now;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: user.role, plan: user.plan, credits: user.credits } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get Profile ───────────────────────────────────────────────────────────────
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get Credits Info ──────────────────────────────────────────────────────────
router.get('/credits', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'credits plan autoApplyEnabled autoApplyThreshold preferredLocations minExpectedSalary'
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Deduct Credits ────────────────────────────────────────────────────────────
router.post('/credits/deduct', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);
    if (user.credits < amount) {
      return res.status(400).json({ message: 'Insufficient credits' });
    }
    user.credits -= amount;
    await user.save();
    res.json({ credits: user.credits, message: 'Credits deducted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Update Auto-Apply Settings (UPDATED — now includes location & salary) ─────
router.put('/auto-apply', verifyToken, async (req, res) => {
  try {
    const { 
      autoApplyEnabled, 
      autoApplyThreshold,
      preferredLocations,   // NEW: ['Noida', 'Delhi', 'Remote']
      minExpectedSalary     // NEW: 8 means 8 LPA minimum
    } = req.body;

    const user = await User.findById(req.user.id);
    if (user.plan !== 'premium') {
      return res.status(403).json({ message: 'Premium feature only' });
    }

    user.autoApplyEnabled  = autoApplyEnabled;
    user.autoApplyThreshold = autoApplyThreshold || 75;

    // Save new filter fields
    if (preferredLocations !== undefined) {
      // Trim whitespace, remove empty strings
      user.preferredLocations = preferredLocations
        .map(l => l.trim())
        .filter(l => l.length > 0);
    }

    if (minExpectedSalary !== undefined) {
      user.minExpectedSalary = Number(minExpectedSalary) || 0;
    }

    await user.save();
    res.json({ 
      message: 'Auto-apply settings updated!',
      autoApplyEnabled,
      autoApplyThreshold,
      preferredLocations: user.preferredLocations,
      minExpectedSalary: user.minExpectedSalary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Create Admin ──────────────────────────────────────────────────────────────
router.post('/create-admin', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;
    if (secretKey !== 'CAREERGUIDE_ADMIN_2026') {
      return res.status(403).json({ message: 'Invalid secret key' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role: 'admin' });
    await user.save();
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ── RAZORPAY PAYMENT ROUTES (NEW) ────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

// STEP 1: Create Razorpay Order
// Frontend is call kare jab user "Upgrade to Premium" button click kare
// POST /api/auth/payment/create-order
router.post('/payment/create-order', verifyToken, async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const Payment  = require('../models/Payment');

    // Already premium check
    const user = await User.findById(req.user.id).select('plan email name');
    if (user.plan === 'premium') {
      return res.status(400).json({ message: 'Already a premium user!' });
    }

    // Pending payment already exists check
    const existingPending = await Payment.findOne({ 
      user: req.user.id, 
      status: 'pending',
      paymentMethod: 'razorpay'
    });
    if (existingPending && existingPending.razorpayOrderId) {
      return res.json({
        orderId:  existingPending.razorpayOrderId,
        amount:   existingPending.amount * 100,
        currency: 'INR',
        keyId:    process.env.RAZORPAY_KEY_ID,
        prefill:  { name: user.name, email: user.email }
      });
    }

    // Sirf EK instance banao
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Order create karo
    const order = await razorpay.orders.create({
      amount:   9900,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId:  req.user.id.toString(),
        purpose: 'CareerGuide Premium Upgrade'
      }
    });

    // DB mein save karo
    const payment = new Payment({
      user:            req.user.id,
      razorpayOrderId: order.id,
      amount:          99,
      currency:        'INR',
      status:          'pending',
      paymentMethod:   'razorpay'
    });
    await payment.save();

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      prefill:  { name: user.name, email: user.email }
    });

  } catch (error) {
    // Full error object log karo
    console.error('Create order error FULL:', JSON.stringify(error));
    console.error('Create order error MSG:', error?.message || error?.error?.description || 'Unknown');
    res.status(500).json({ 
      message: 'Order create nahi hua: ' + (error?.error?.description || error?.message || JSON.stringify(error))
    });
  }
});

// STEP 2: Verify Payment After User Pays
// Razorpay checkout close hone ke baad frontend ye call karta hai
// POST /api/auth/payment/verify
router.post('/payment/verify', verifyToken, async (req, res) => {
  try {
    const crypto  = require('crypto');
    const Payment = require('../models/Payment');

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Payment details incomplete' });
    }

    // ── Signature Verify (MOST IMPORTANT — tampering rokta hai) ──────────────
    // Razorpay ne jo signature bheja hai usse verify karo
    // Formula: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // Signature match nahi — koi tamper kar raha hai
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed' }
      );
      return res.status(400).json({ message: 'Payment verification failed! Invalid signature.' });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Signature valid hai — payment genuine hai
    // Payment record update karo
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { 
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'approved'
      }
    );

    // User ko premium upgrade karo — INSTANTLY
    await User.findByIdAndUpdate(req.user.id, {
      plan:               'premium',
      credits:            1000,
      creditsLastReset:   new Date()
    });

    console.log(`✅ Payment verified! User ${req.user.id} upgraded to Premium`);

    res.json({ 
      success: true,
      message: '🎉 Payment successful! Premium activated instantly!' 
    });
  } catch (error) {
    console.error('Verify payment error:', error.message);
    res.status(500).json({ message: 'Verification failed: ' + error.message });
  }
});

// ── Old manual UTR route — kept for backward compatibility ────────────────────
router.post('/payment-request', verifyToken, async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const { utr } = req.body;
    if (!utr || utr.length < 10) {
      return res.status(400).json({ message: 'Invalid UTR number' });
    }
    const existing = await Payment.findOne({ user: req.user.id, status: 'pending', paymentMethod: 'manual' });
    if (existing) {
      return res.status(400).json({ message: 'Payment request already pending' });
    }
    const payment = new Payment({ user: req.user.id, utr, paymentMethod: 'manual' });
    await payment.save();
    res.json({ message: 'Payment request submitted! Admin will verify shortly.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
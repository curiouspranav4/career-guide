const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const app = express();

// ── IMPORTANT: Razorpay Webhook ke liye raw body PEHLE parse karo ─────────────
// express.json() se PEHLE ye aana chahiye — warna webhook signature verify
// nahi ho paayega (raw body chahiye hota hai HMAC ke liye)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Baaki sab routes ke liye normal JSON parser
// app.use(cors());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const resumeRoutes    = require('./routes/resume');
const jobRoutes       = require('./routes/jobs');
const adminRoutes     = require('./routes/admin');
const interviewRoutes = require('./routes/interview');

app.use('/api/auth',      authRoutes);
app.use('/api/resume',    resumeRoutes);
app.use('/api/jobs',      jobRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/interview', interviewRoutes);

// ── Razorpay Webhook Handler ──────────────────────────────────────────────────
// Ye Razorpay directly call karta hai jab payment complete ho
// URL: POST /api/payment/webhook
// Razorpay Dashboard pe ye URL set karni padegi

// app.post('/api/payment/webhook', async (req, res) => {
//   try {
//     const Payment = require('./models/Payment');
//     const User    = require('./models/User');

//     // Razorpay ka signature header
//     const razorpaySignature = req.headers['x-razorpay-signature'];

//     // Webhook secret se verify karo (Razorpay Dashboard se milta hai)
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
//       .update(req.body)  // raw body (Buffer)
//       .digest('hex');

//     if (expectedSignature !== razorpaySignature) {
//       console.log('❌ Webhook: Invalid signature');
//       return res.status(400).json({ message: 'Invalid webhook signature' });
//     }

//     // Parse the event
//     const event = JSON.parse(req.body.toString());
//     console.log('📨 Webhook event:', event.event);

//     // payment.captured = payment successful
//     if (event.event === 'payment.captured') {
//       const paymentData = event.payload.payment.entity;
//       const orderId     = paymentData.order_id;
//       const paymentId   = paymentData.id;

//       // Payment record find karo
//       const payment = await Payment.findOne({ razorpayOrderId: orderId })
//         .populate('user');

//       if (!payment) {
//         console.log('❌ Webhook: Payment record not found for order:', orderId);
//         return res.json({ received: true }); // 200 dena zaroori hai Razorpay ko
//       }

//       if (payment.status === 'approved') {
//         console.log('ℹ️ Webhook: Already processed:', orderId);
//         return res.json({ received: true });
//       }

//       // Payment approve karo + User upgrade karo
//       await Payment.findByIdAndUpdate(payment._id, {
//         razorpayPaymentId: paymentId,
//         status:            'approved'
//       });

//       await User.findByIdAndUpdate(payment.user._id, {
//         plan:             'premium',
//         credits:          1000,
//         creditsLastReset: new Date()
//       });

//       console.log(`✅ Webhook: User ${payment.user._id} upgraded via webhook!`);
//     }

//     // payment.failed = payment failed
//     if (event.event === 'payment.failed') {
//       const orderId = event.payload.payment.entity.order_id;
//       await Payment.findOneAndUpdate(
//         { razorpayOrderId: orderId },
//         { status: 'failed' }
//       );
//       console.log(`❌ Webhook: Payment failed for order: ${orderId}`);
//     }

//     res.json({ received: true }); // Razorpay ko 200 milna zaroori hai
//   } catch (error) {
//     console.error('Webhook error:', error.message);
//     res.status(500).json({ message: error.message });
//   }
// });

// ── MongoDB Connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.log('DB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ── CORS (Allows Vercel live site + localhost cleanly) ────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS,PATCH'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Webhook ke liye raw body (CORS ke baad)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── Health Check Route (Render status check ke liye) ──────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CareerGuide AI Backend' });
});

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

// ── MongoDB Connection ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch((err) => console.log('DB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
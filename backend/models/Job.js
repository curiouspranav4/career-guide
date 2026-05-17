const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  requiredSkills: [String],
  experienceLevel: { type: String, enum: ['fresher', 'junior', 'mid', 'senior'], default: 'fresher' },

  // salary: old string field — kept for backward compatibility
  salary: { type: String, default: 'Not Disclosed' },

  // ── NEW: salaryLPA — numeric salary in Lakhs Per Annum ──────────────────────
  // Recruiter ye fill kare — 0 means "Not Disclosed"
  // Example: 10 means 10 LPA, 8.5 means 8.5 LPA
  // Auto-apply filter is field ko use karta hai comparison ke liye
  salaryLPA: { type: Number, default: 0 },
  // ────────────────────────────────────────────────────────────────────────────

  jobType: { type: String, enum: ['full-time', 'part-time', 'internship', 'remote'], default: 'full-time' },
  category: { type: String, required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Applicants
  applicants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    matchPercent: { type: Number, default: 0 },
    appliedAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['applied', 'shortlisted', 'interview', 'selected', 'rejected'], 
      default: 'applied' 
    }
  }],

  // Saved by job seekers
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Recruiter updates for this job
  updates: [{
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);
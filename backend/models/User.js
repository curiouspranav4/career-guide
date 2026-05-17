const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['job_seeker_fresher', 'job_seeker_experienced', 'recruiter', 'admin'], 
    default: 'job_seeker_fresher' 
  },

  // Plan - Free or Premium
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  
  // Credits system
  credits: { type: Number, default: 50 },
  creditsLastReset: { type: Date, default: Date.now },

  // GSTIN for recruiter verification
  gstin: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },

  // Job Seeker fields
  skills: [String],
  interests: [String],
  education: {
    degree: String,
    institution: String,
    year: String
  },
  experience: {
    years: Number,
    currentCompany: String,
    designation: String
  },
  resumeUrl: { type: String, default: '' },

  // Auto apply settings (premium only)
  autoApplyThreshold: { type: Number, default: 75 },
  autoApplyEnabled: { type: Boolean, default: false },

  // ── NEW: Auto-Apply Filters (premium only) ──────────────────────────────────
  // Preferred locations for auto-apply (e.g. ['Noida', 'Delhi', 'Remote'])
  // Empty array = apply to all locations (no location filter)
  preferredLocations: { type: [String], default: [] },

  // Minimum expected salary in LPA (e.g. 8 means 8 LPA)
  // 0 = no minimum salary filter
  minExpectedSalary: { type: Number, default: 0 },
  // ────────────────────────────────────────────────────────────────────────────
  
  // Recruiter fields
  companyName: { type: String, default: '' },
  companyWebsite: { type: String, default: '' },
  designation: { type: String, default: '' },
  
  // Recruiter verification
  recruiterStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  recruiterRejectionReason: { type: String, default: '' },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
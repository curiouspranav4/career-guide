const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  extractedSkills: [String],
  extractedText: { type: String, default: '' },
  recommendedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resume', resumeSchema);
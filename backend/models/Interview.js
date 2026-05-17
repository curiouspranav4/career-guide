const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Job context
  jobRole: { type: String, required: true },
  jobDescription: { type: String, default: '' },
  techStack: [String],
  difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

  // Resume
  resumeUploaded: { type: Boolean, default: false },

  // Interview Q&A log
  questions: [{
    questionText: { type: String },
    isCodeQuestion: { type: Boolean, default: false },  // true for Q9 (output) and Q10 (bug-find)
    userAnswer: { type: String, default: '' },
    aiFeedback: { type: String, default: '' },
    score: { type: Number, default: 0 },                // 0-10 per question
    timeSpent: { type: Number, default: 0 }             // seconds
  }],

  // Overall result
  totalScore: { type: Number, default: 0 },             // 0-100
  overallFeedback: { type: String, default: '' },
  strengths: [String],
  improvements: [String],

  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },

  // For daily limit tracking
  interviewDate: {
    type: String,  // "YYYY-MM-DD" format — easy date comparison
    default: () => new Date().toISOString().split('T')[0]
  },

  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Interview', interviewSchema);
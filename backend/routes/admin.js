const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Job = require('../models/Job');
const Resume = require('../models/Resume');

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get dashboard stats
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const totalJobSeekers = await User.countDocuments({ 
      role: { $in: ['job_seeker_fresher', 'job_seeker_experienced'] } 
    });
    const totalRecruiters = await User.countDocuments({ role: 'recruiter' });
    const totalJobs = await Job.countDocuments();
    const totalResumes = await Resume.countDocuments();
    
    const recentJobSeekers = await User.find({ 
      role: { $in: ['job_seeker_fresher', 'job_seeker_experienced'] } 
    }).select('-password').sort({ createdAt: -1 }).limit(5);

    const recentRecruiters = await User.find({ 
      role: 'recruiter' 
    }).select('-password').sort({ createdAt: -1 }).limit(5);

    res.json({ totalJobSeekers, totalRecruiters, totalJobs, totalResumes, recentJobSeekers, recentRecruiters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all job seekers
router.get('/jobseekers', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({ 
      role: { $in: ['job_seeker_fresher', 'job_seeker_experienced'] } 
    }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending recruiters - PEHLE SPECIFIC ROUTE
router.get('/recruiters/pending', verifyAdmin, async (req, res) => {
  try {
    const recruiters = await User.find({ 
      role: 'recruiter', 
      recruiterStatus: 'pending' 
    }).select('-password').sort({ createdAt: -1 });
    res.json(recruiters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all recruiters - BAAD MEIN GENERAL ROUTE
router.get('/recruiters', verifyAdmin, async (req, res) => {
  try {
    const recruiters = await User.find({ role: 'recruiter' })
      .select('-password').sort({ createdAt: -1 });
    res.json(recruiters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/Reject recruiter
router.put('/recruiters/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const recruiter = await User.findById(req.params.id);
    if (!recruiter) return res.status(404).json({ message: 'Recruiter not found' });
    
    recruiter.recruiterStatus = status;
    if (reason) recruiter.recruiterRejectionReason = reason;
    await recruiter.save();
    
    res.json({ message: 'Recruiter status updated to ' + status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all jobs with recruiter + applicant info
router.get('/jobs', verifyAdmin, async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('postedBy', 'name email companyName designation')
      .populate('applicants.user', 'name email role')
      .sort({ createdAt: -1 });
    
    const filteredJobs = jobs.map(job => {
      const jobObj = job.toObject();
      jobObj.applicants = jobObj.applicants.filter(a => a.user !== null);
      return jobObj;
    });
    res.json(filteredJobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete job
router.delete('/jobs/:id', verifyAdmin, async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all resumes
router.get('/resumes', verifyAdmin, async (req, res) => {
  try {
    const resumes = await Resume.find()
      .populate('user', 'name email role')
      .sort({ uploadedAt: -1 });
    res.json(resumes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all payment requests
router.get('/payments', verifyAdmin, async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const payments = await Payment.find()
      .populate('user', 'name email plan')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/Reject payment
router.put('/payments/:id', verifyAdmin, async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id).populate('user');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = status;
    await payment.save();

    if (status === 'approved') {
      await User.findByIdAndUpdate(payment.user._id, {
        plan: 'premium',
        credits: 1000,
        creditsLastReset: new Date()
      });
    }

    res.json({ message: 'Payment ' + status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
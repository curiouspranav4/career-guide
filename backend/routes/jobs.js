const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

const isJobSeeker = (role) => role === 'job_seeker_fresher' || role === 'job_seeker_experienced';

// ── Get all jobs ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true })
      .populate('postedBy', 'name companyName designation')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get job by ID ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name companyName designation companyWebsite')
      .populate('applicants.user', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Search jobs ───────────────────────────────────────────────────────────────
router.post('/search', async (req, res) => {
  try {
    const { skills } = req.body;
    const validRegexes = skills.map(s => {
      try { return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); } catch { return null; }
    }).filter(Boolean);
    const jobs = await Job.find({
      isActive: true,
      requiredSkills: { $in: validRegexes }
    }).populate('postedBy', 'name companyName').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Post new job — recruiter only ─────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can post jobs' });
    }

    const recruiterUser = await User.findById(req.user.id);
    if (recruiterUser.recruiterStatus !== 'approved') {
      return res.status(403).json({ 
        message: 'Your recruiter account is pending admin approval.' 
      });
    }

    const job = new Job({ ...req.body, postedBy: req.user.id });
    await job.save();

    // ── AUTO-APPLY LOGIC (UPDATED with Location + Salary filters) ─────────────
    try {
      const Resume = require('../models/Resume');

      // Fetch all premium users with auto-apply enabled and enough credits
      const premiumUsers = await User.find({
        plan:            'premium',
        autoApplyEnabled: true,
        role:            { $in: ['job_seeker_fresher', 'job_seeker_experienced'] },
        credits:         { $gte: 50 }
      });

      for (const premUser of premiumUsers) {
        try {
          // ── FILTER 1: Location Check ─────────────────────────────────────
          // Agar user ne preferred locations set kiye hain, toh check karo
          // Empty array = koi location filter nahi (sabhi jagah apply karo)
          if (premUser.preferredLocations && premUser.preferredLocations.length > 0) {
            const jobLocationLower = (job.location || '').toLowerCase().trim();

            // Check karo ki job ki location user ke preferred locations mein se
            // kisi ek se match karti hai (case-insensitive, partial match)
            const locationMatch = premUser.preferredLocations.some(prefLoc =>
              jobLocationLower.includes(prefLoc.toLowerCase().trim()) ||
              prefLoc.toLowerCase().trim().includes(jobLocationLower)
            );

            if (!locationMatch) {
              console.log(
                `⏭ Skip (location): ${premUser.name} | ` +
                `Job: ${job.location} | ` +
                `Preferred: ${premUser.preferredLocations.join(', ')}`
              );
              continue; // Is user ke liye skip, agle user pe jao
            }
          }
          // ─────────────────────────────────────────────────────────────────

          // ── FILTER 2: Salary Check ───────────────────────────────────────
          // Agar user ne minimum expected salary set ki hai (0 se zyada)
          // aur job mein salaryLPA 0 se zyada hai (disclosed hai)
          if (premUser.minExpectedSalary > 0 && job.salaryLPA > 0) {
            if (job.salaryLPA < premUser.minExpectedSalary) {
              console.log(
                `⏭ Skip (salary): ${premUser.name} | ` +
                `Job: ${job.salaryLPA} LPA | ` +
                `Min Expected: ${premUser.minExpectedSalary} LPA`
              );
              continue; // Salary kam hai — skip
            }
          }
          // ─────────────────────────────────────────────────────────────────

          // ── FILTER 3: Skill Match % Check (existing logic) ───────────────
          const resume = await Resume.findOne({ user: premUser._id })
            .sort({ uploadedAt: -1 });

          if (!resume || !resume.extractedSkills.length) continue;

          const jobSkills = job.requiredSkills || [];
          if (jobSkills.length === 0) continue;

          const matched = jobSkills.filter(js =>
            resume.extractedSkills.some(rs =>
              rs.toLowerCase() === js.toLowerCase()
            )
          );

          const matchPercent = Math.round((matched.length / jobSkills.length) * 100);

          const threshold = premUser.autoApplyThreshold || 75;
          if (matchPercent < threshold) {
            console.log(
              `⏭ Skip (match%): ${premUser.name} | ` +
              `Match: ${matchPercent}% | Threshold: ${threshold}%`
            );
            continue;
          }
          // ─────────────────────────────────────────────────────────────────

          // Already applied check
          const alreadyApplied = job.applicants.find(
            a => a.user.toString() === premUser._id.toString()
          );
          if (alreadyApplied) continue;

          // ✅ Saare filters pass — AUTO APPLY KAR DO
          job.applicants.push({
            user:        premUser._id,
            resume:      resume._id,
            matchPercent,
            appliedAt:   new Date()
          });

          premUser.credits -= 50;
          await premUser.save();

          console.log(
            `✅ Auto-applied: ${premUser.name} → ${job.title} | ` +
            `Match: ${matchPercent}% | ` +
            `Location: ${job.location} | ` +
            `Salary: ${job.salaryLPA} LPA`
          );
        } catch (e) {
          console.log('Auto-apply error for user:', e.message);
        }
      }

      await job.save();
    } catch (e) {
      console.log('Auto-apply process error:', e.message);
    }
    // ── END AUTO-APPLY ────────────────────────────────────────────────────────

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Delete job ────────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (req.user.role !== 'admin' && job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Apply for job ─────────────────────────────────────────────────────────────
router.post('/:id/apply', verifyToken, async (req, res) => {
  try {
    if (!isJobSeeker(req.user.role)) {
      return res.status(403).json({ message: 'Only job seekers can apply' });
    }
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const alreadyApplied = job.applicants.find(a => a.user.toString() === req.user.id);
    if (alreadyApplied) return res.status(400).json({ message: 'Already applied' });

    const Resume = require('../models/Resume');
    const resume = await Resume.findOne({ user: req.user.id }).sort({ uploadedAt: -1 });
    
    let matchPercent = 0;
    let resumeId = null;
    
    if (resume) {
      resumeId = resume._id;
      const matched = job.requiredSkills.filter(js =>
        resume.extractedSkills.some(rs => rs.toLowerCase() === js.toLowerCase())
      );
      matchPercent = job.requiredSkills.length > 0
        ? Math.round((matched.length / job.requiredSkills.length) * 100)
        : 0;
    }

    job.applicants.push({ user: req.user.id, resume: resumeId, matchPercent });
    await job.save();
    res.json({ message: 'Applied successfully', matchPercent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Save / Unsave job ─────────────────────────────────────────────────────────
router.post('/:id/save', verifyToken, async (req, res) => {
  try {
    if (!isJobSeeker(req.user.role)) {
      return res.status(403).json({ message: 'Only job seekers can save jobs' });
    }
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const alreadySaved = job.savedBy.includes(req.user.id);
    if (alreadySaved) {
      job.savedBy = job.savedBy.filter(id => id.toString() !== req.user.id);
      await job.save();
      return res.json({ message: 'Job unsaved', saved: false });
    }
    job.savedBy.push(req.user.id);
    await job.save();
    res.json({ message: 'Job saved', saved: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get saved jobs ────────────────────────────────────────────────────────────
router.get('/user/saved', verifyToken, async (req, res) => {
  try {
    if (!isJobSeeker(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    const jobs = await Job.find({ savedBy: req.user.id, isActive: true })
      .populate('postedBy', 'name companyName')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get applied jobs ──────────────────────────────────────────────────────────
router.get('/user/applied', verifyToken, async (req, res) => {
  try {
    if (!isJobSeeker(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    const jobs = await Job.find({ 'applicants.user': req.user.id, isActive: true })
      .populate('postedBy', 'name companyName')
      .sort({ createdAt: -1 });
    
    const result = jobs.map(job => {
      const application = job.applicants.find(a => a.user.toString() === req.user.id);
      return {
        ...job.toObject(),
        applicationStatus:  application?.status,
        appliedAt:          application?.appliedAt,
        recruiterUpdates:   job.updates
      };
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get recruiter's jobs ──────────────────────────────────────────────────────
router.get('/recruiter/myjobs', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') return res.status(403).json({ message: 'Access denied' });
    const jobs = await Job.find({ postedBy: req.user.id })
      .populate('applicants.user', 'name email skills')
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

// ── Update applicant status ───────────────────────────────────────────────────
router.put('/:id/applicant/:userId/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') return res.status(403).json({ message: 'Access denied' });
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.postedBy.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    const applicant = job.applicants.find(a => a.user.toString() === req.params.userId);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found' });

    applicant.status = status;
    await job.save();
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Post job update ───────────────────────────────────────────────────────────
router.post('/:id/update', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') return res.status(403).json({ message: 'Access denied' });
    const { message } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.postedBy.toString() !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    job.updates.push({ message });
    await job.save();
    res.json({ message: 'Update posted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
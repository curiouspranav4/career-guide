// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const fs = require('fs');
// const jwt = require('jsonwebtoken');
// const Resume = require('../models/Resume');
// const Job = require('../models/Job');

// const verifyToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'No token' });
//   try {
//     req.user = jwt.verify(token, process.env.JWT_SECRET);
//     next();
//   } catch {
//     res.status(401).json({ message: 'Invalid token' });
//   }
// };

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });
// const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// const skillsList = [
//   'javascript', 'python', 'java', 'react', 'node', 'mongodb', 'express',
//   'html', 'css', 'sql', 'mysql', 'php', 'typescript',
//   'angular', 'vue', 'django', 'flask', 'spring', 'git', 'docker',
//   'kubernetes', 'aws', 'azure', 'machine learning', 'deep learning',
//   'data science', 'tensorflow', 'nlp', 'tableau', 'excel', 'power bi',
//   'next.js', 'nextjs', 'react.js', 'node.js', 'express.js', 'tailwind',
//   'tailwindcss', 'algorithms', 'data structures', 'operating system',
//   'computer network', 'dbms', 'database management', 'cplusplus', 'csharp'
// ];

// const extractSkills = (text) => {
//   const lowerText = text.toLowerCase().replace('c++', 'cplusplus').replace('c#', 'csharp');
//   return skillsList.filter(skill => lowerText.includes(skill.toLowerCase()));
// };

// const safeRegex = (s) => {
//   try {
//     return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
//   } catch(e) { return null; }
// };

// // Calculate skill match percentage

// const calcMatchPercent = (resumeSkills, jobSkills) => {
//   if (!jobSkills || jobSkills.length === 0) return 0;
//   if (!resumeSkills || resumeSkills.length === 0) return 0;
//   const matched = jobSkills.filter(js =>
//     resumeSkills.some(rs => rs.toLowerCase() === js.toLowerCase())
//   );
//   return Math.round((matched.length / jobSkills.length) * 100);
// };

// // const calcMatchPercent = (resumeSkills, jobSkills) => {
// //   if (!jobSkills || jobSkills.length === 0) return 0;
// //   if (!resumeSkills || resumeSkills.length === 0) return 0;
  
// //   const matched = jobSkills.filter(js => {
// //     const jobWords = js.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2);
// //     return resumeSkills.some(rs => {
// //       const resWords = rs.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2);
// //       // Exact match
// //       if (rs.toLowerCase() === js.toLowerCase()) return true;
// //       // Check if any job word matches any resume word
// //       return jobWords.some(jw => resWords.some(rw => jw === rw));
// //     });
// //   });
  
// //   return Math.round((matched.length / jobSkills.length) * 100);
// // };

// const extractTextFromPDF = (buffer) => {
//   return new Promise((resolve) => {
//     try {
//       const originalEmit = process.emit;
//       process.emit = function(event, error) {
//         if (event === 'warning' && error.name === 'ExperimentalWarning') return false;
//         return originalEmit.apply(process, arguments);
//       };
//       const pdfParse = require('pdf-parse');
//       pdfParse(buffer).then(data => {
//         process.emit = originalEmit;
//         resolve(data.text || '');
//       }).catch(() => {
//         process.emit = originalEmit;
//         resolve('');
//       });
//     } catch(e) { resolve(''); }
//   });
// };

// // Upload resume
// router.post('/upload', verifyToken, upload.single('resume'), async (req, res) => {
//   try {
//     const fileBuffer = fs.readFileSync(req.file.path);
//     const extractedText = await extractTextFromPDF(fileBuffer);
//     const extractedSkills = extractSkills(extractedText);
//     const validRegexes = extractedSkills.map(safeRegex).filter(r => r !== null);

//     const recommendedJobs = await Job.find({
//       requiredSkills: { $in: validRegexes }
//     }).limit(10);

//     const resume = new Resume({
//       user: req.user.id,
//       fileName: req.file.originalname,
//       filePath: req.file.path.replace(/\\/g, '/'),
//       extractedSkills,
//       extractedText,
//       recommendedJobs: recommendedJobs.map(j => j._id)
//     });

//     await resume.save();
//     res.json({ resume, recommendedJobs, extractedSkills });
//   } catch (error) {
//     console.log('Error:', error.message);
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get my resumes
// router.get('/my', verifyToken, async (req, res) => {
//   try {
//     const resumes = await Resume.find({ user: req.user.id })
//       .populate('recommendedJobs')
//       .sort({ uploadedAt: -1 });
//     res.json(resumes);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get resume of a specific user (for recruiter) + match % with a job
// router.get('/user/:userId', verifyToken, async (req, res) => {
//   try {
//     if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Access denied' });
//     }
//     const resume = await Resume.findOne({ user: req.params.userId })
//       .sort({ uploadedAt: -1 });

//     if (!resume) return res.status(404).json({ message: 'No resume found' });

//     // If jobId provided, calculate match %
//     let matchPercent = null;
//     if (req.query.jobId) {
//       const job = await Job.findById(req.query.jobId);
//       if (job) {
//         matchPercent = calcMatchPercent(resume.extractedSkills, job.requiredSkills);
//       }
//     }

//     res.json({ resume, matchPercent });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // Get match % for a job seeker for a specific job
// router.get('/match/:jobId', verifyToken, async (req, res) => {
//   try {
//     const resume = await Resume.findOne({ user: req.user.id }).sort({ uploadedAt: -1 });
//     if (!resume) return res.json({ matchPercent: 0, hasResume: false });

//     const job = await Job.findById(req.params.jobId);
//     if (!job) return res.status(404).json({ message: 'Job not found' });

//     const matchPercent = calcMatchPercent(resume.extractedSkills, job.requiredSkills);
//     const matchedSkills = job.requiredSkills.filter(js =>
//       resume.extractedSkills.some(rs => rs.toLowerCase() === js.toLowerCase())
//     );
//     const missingSkills = job.requiredSkills.filter(js =>
//       !resume.extractedSkills.some(rs => rs.toLowerCase() === js.toLowerCase())
//     );

//     res.json({ matchPercent, hasResume: true, matchedSkills, missingSkills });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router;































const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Resume = require('../models/Resume');
const Job = require('../models/Job');

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const skillsList = [
  // ── IT & Software Development ──
  'javascript', 'python', 'java', 'react', 'node', 'mongodb', 'express',
  'html', 'css', 'sql', 'mysql', 'php', 'typescript', 'angular', 'vue',
  'django', 'flask', 'spring', 'git', 'docker', 'kubernetes', 'aws', 'azure',
  'machine learning', 'deep learning', 'data science', 'tensorflow', 'nlp',
  'next.js', 'nextjs', 'react.js', 'node.js', 'express.js', 'tailwind',
  'tailwindcss', 'algorithms', 'data structures', 'operating system',
  'computer network', 'dbms', 'database management', 'cplusplus', 'csharp',
  'ruby', 'rails', 'kotlin', 'swift', 'flutter', 'dart', 'golang', 'rust',
  'scala', 'redis', 'postgresql', 'graphql', 'rest api', 'microservices',
  'linux', 'bash', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'devops',
  'firebase', 'supabase', 'vercel', 'netlify', 'heroku', 'selenium',
  'jest', 'mocha', 'cypress', 'agile', 'scrum', 'jira', 'github',
  'opencv', 'pytorch', 'keras', 'scikit-learn', 'hadoop', 'spark',
  'kafka', 'elasticsearch', 'blockchain', 'solidity', 'web3',

  // ── Data & Analytics ──
  'data analysis', 'data visualization', 'statistics', 'r programming',
  'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'spss', 'sas',
  'tableau', 'power bi', 'excel', 'google analytics', 'looker', 'hive',
  'business intelligence', 'etl', 'data warehousing', 'data engineering',
  'data modeling', 'big data', 'forecasting', 'regression', 'classification',

  // ── Finance & Accounting ──
  'accounting', 'finance', 'financial analysis', 'financial modeling',
  'tally', 'gst', 'taxation', 'auditing', 'budgeting', 'cost accounting',
  'valuation', 'bloomberg', 'capital markets', 'investment banking',
  'equity research', 'risk management', 'portfolio management',
  'derivatives', 'mutual funds', 'ifrs', 'gaap', 'balance sheet',
  'income statement', 'cash flow', 'ms excel', 'quickbooks', 'zoho books',
  'banking', 'credit analysis', 'loan processing', 'insurance', 'actuarial',
  'wealth management', 'corporate finance', 'mergers and acquisitions',
  'private equity', 'venture capital', 'hedge fund', 'forex', 'trading',

  // ── Marketing & Digital Marketing ──
  'digital marketing', 'seo', 'sem', 'social media marketing',
  'content marketing', 'email marketing', 'facebook ads', 'google ads',
  'copywriting', 'brand management', 'market research', 'crm',
  'salesforce', 'hubspot', 'marketing automation', 'affiliate marketing',
  'influencer marketing', 'performance marketing', 'growth hacking',
  'ppc', 'conversion optimization', 'a/b testing', 'wordpress',
  'shopify', 'woocommerce', 'mailchimp', 'hootsuite', 'buffer',
  'content creation', 'video marketing', 'podcast', 'pr',
  'public relations', 'advertising', 'media buying', 'analytics',

  // ── Design & Creative ──
  'figma', 'adobe xd', 'sketch', 'photoshop', 'illustrator', 'indesign',
  'canva', 'ui design', 'ux design', 'ui/ux', 'user research',
  'wireframing', 'prototyping', 'motion graphics', 'after effects',
  'premiere pro', 'graphic design', '3d modeling', 'blender', 'autocad',
  'solidworks', 'revit', 'archicad', 'typography', 'branding',
  'logo design', 'illustration', 'video editing', 'animation',
  'final cut pro', 'davinci resolve', 'lightroom', 'photography',

  // ── Sales & Business Development ──
  'sales', 'business development', 'lead generation', 'cold calling',
  'account management', 'negotiation', 'b2b sales', 'b2c sales',
  'inside sales', 'field sales', 'channel sales', 'revenue growth',
  'customer success', 'pipeline management', 'deal closing',
  'proposal writing', 'client management', 'territory management',

  // ── HR & Talent ──
  'human resources', 'recruitment', 'talent acquisition', 'payroll',
  'performance management', 'training and development', 'employee relations',
  'hris', 'workday', 'sap hr', 'compensation and benefits', 'onboarding',
  'hr analytics', 'learning and development', 'succession planning',
  'organizational development', 'labor law', 'hr policies',

  // ── Operations & Management ──
  'project management', 'operations management', 'supply chain',
  'logistics', 'erp', 'sap', 'oracle', 'six sigma', 'lean',
  'process improvement', 'quality management', 'vendor management',
  'procurement', 'inventory management', 'ms project', 'trello',
  'asana', 'notion', 'product management', 'product roadmap',
  'stakeholder management', 'change management', 'strategy',
  'consulting', 'business analysis', 'requirements gathering',

  // ── Communication & Soft Skills ──
  'communication', 'leadership', 'teamwork', 'problem solving',
  'critical thinking', 'time management', 'presentation', 'ms office',
  'microsoft office', 'ms word', 'ms powerpoint', 'report writing',
  'research', 'documentation', 'client communication',

  // ── Legal & Compliance ──
  'legal research', 'contract management', 'compliance', 'corporate law',
  'intellectual property', 'litigation', 'drafting', 'legal writing',
  'due diligence', 'regulatory affairs', 'gdpr', 'sebi regulations',

  // ── Healthcare & Life Sciences ──
  'medical coding', 'clinical research', 'pharmacovigilance',
  'healthcare management', 'nursing', 'pharmacy', 'biomedical',
  'clinical trials', 'medical writing', 'bioinformatics',

  // ── Education & Teaching ──
  'teaching', 'curriculum development', 'e-learning', 'instructional design',
  'content development', 'training', 'mentoring', 'coaching',

  // ── Civil & Mechanical Engineering ──
  'civil engineering', 'structural analysis', 'construction management',
  'mechanical engineering', 'manufacturing', 'quality control',
  'cad', 'cam', 'cnc', 'product design', 'testing', 'simulation'
];

const extractSkills = (text) => {
  const lowerText = text.toLowerCase()
    .replace('c++', 'cplusplus')
    .replace('c#', 'csharp')
    .replace('ui/ux', 'ui/ux')
    .replace('b2b', 'b2b sales')
    .replace('b2c', 'b2c sales');
  return skillsList.filter(skill => lowerText.includes(skill.toLowerCase()));
};

const safeRegex = (s) => {
  try {
    return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  } catch(e) { return null; }
};

const calcMatchPercent = (resumeSkills, jobSkills) => {
  if (!jobSkills || jobSkills.length === 0) return 0;
  if (!resumeSkills || resumeSkills.length === 0) return 0;
  const matched = jobSkills.filter(js =>
    resumeSkills.some(rs => rs.toLowerCase() === js.toLowerCase())
  );
  return Math.round((matched.length / jobSkills.length) * 100);
};

const extractTextFromPDF = (buffer) => {
  return new Promise((resolve) => {
    try {
      const originalEmit = process.emit;
      process.emit = function(event, error) {
        if (event === 'warning' && error.name === 'ExperimentalWarning') return false;
        return originalEmit.apply(process, arguments);
      };
      const pdfParse = require('pdf-parse');
      pdfParse(buffer).then(data => {
        process.emit = originalEmit;
        resolve(data.text || '');
      }).catch(() => {
        process.emit = originalEmit;
        resolve('');
      });
    } catch(e) { resolve(''); }
  });
};

// Helper to build file URL
const getFileUrl = (filePath) => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const cleanPath = filePath.replace(/\\/g, '/');
  return `${backendUrl}/${cleanPath}`;
};

// Upload resume
router.post('/upload', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const extractedText = await extractTextFromPDF(fileBuffer);
    const extractedSkills = extractSkills(extractedText);
    const validRegexes = extractedSkills.map(safeRegex).filter(r => r !== null);

    const recommendedJobs = await Job.find({
      requiredSkills: { $in: validRegexes }
    }).limit(10);

    const filePath = req.file.path.replace(/\\/g, '/');
    const fileUrl = getFileUrl(filePath);

    const resume = new Resume({
      user: req.user.id,
      fileName: req.file.originalname,
      filePath,
      fileUrl,
      extractedSkills,
      extractedText,
      recommendedJobs: recommendedJobs.map(j => j._id)
    });

    await resume.save();
    res.json({ resume, recommendedJobs, extractedSkills });
  } catch (error) {
    console.log('Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get my resumes
router.get('/my', verifyToken, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id })
      .populate('recommendedJobs')
      .sort({ uploadedAt: -1 });

    const resumesWithUrl = resumes.map(r => ({
      ...r.toObject(),
      fileUrl: r.fileUrl || getFileUrl(r.filePath)
    }));

    res.json(resumesWithUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get resume of a specific user (for recruiter) + match % with a job
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const resume = await Resume.findOne({ user: req.params.userId })
      .sort({ uploadedAt: -1 });

    if (!resume) return res.status(404).json({ message: 'No resume found' });

    let matchPercent = null;
    if (req.query.jobId) {
      const job = await Job.findById(req.query.jobId);
      if (job) {
        matchPercent = calcMatchPercent(resume.extractedSkills, job.requiredSkills);
      }
    }

    const resumeObj = resume.toObject();
    resumeObj.fileUrl = resume.fileUrl || getFileUrl(resume.filePath);

    res.json({ resume: resumeObj, matchPercent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get match % for a job seeker for a specific job
router.get('/match/:jobId', verifyToken, async (req, res) => {
  try {
    const resume = await Resume.findOne({ user: req.user.id }).sort({ uploadedAt: -1 });
    if (!resume) return res.json({ matchPercent: 0, hasResume: false });

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const matchPercent = calcMatchPercent(resume.extractedSkills, job.requiredSkills);
    const matchedSkills = job.requiredSkills.filter(js =>
      resume.extractedSkills.some(rs => rs.toLowerCase() === js.toLowerCase())
    );
    const missingSkills = job.requiredSkills.filter(js =>
      !resume.extractedSkills.some(rs => rs.toLowerCase() === js.toLowerCase())
    );

    res.json({ matchPercent, hasResume: true, matchedSkills, missingSkills });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Interview = require('../models/Interview');
const User = require('../models/User');

// ─── Multer (memory only — no file saved to disk) ─────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' ||
        file.mimetype === 'text/plain' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, or DOC/DOCX files are allowed'), false);
    }
  }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ─── Daily Limit Check ────────────────────────────────────────────────────────
const checkDailyLimit = async (userId, plan) => {
  const today = new Date().toISOString().split('T')[0];
  const limit = plan === 'premium' ? 10 : 1;
  const todayCount = await Interview.countDocuments({
    user: userId,
    interviewDate: today,
    status: { $in: ['completed', 'in_progress'] }
  });
  return { todayCount, limit, canInterview: todayCount < limit };
};

// ─── Groq API Call ────────────────────────────────────────────────────────────
const callGroq = async (prompt) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in .env!');
  }

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant', // 70b for better code + evaluation quality
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 3500
  });

  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned an empty response');
  return text;
};

// ─── Safe JSON Parse ──────────────────────────────────────────────────────────
const safeParseJSON = (text) => {
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  try { return JSON.parse(cleaned); } catch {}

  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch {}
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }

  return null;
};

// ─── Extract text from resume buffer ─────────────────────────────────────────
const extractResumeText = async (file) => {
  if (!file) return '';

  try {
    if (file.mimetype === 'application/pdf') {
      const data = await pdfParse(file.buffer);
      return data.text?.substring(0, 3000) || ''; // limit to 3000 chars for prompt
    }
    // For plain text / doc fallback
    return file.buffer.toString('utf-8').substring(0, 3000);
  } catch (e) {
    console.error('Resume parse error:', e.message);
    return '';
  }
};

// ─── ROUTE 1: Check daily limit ───────────────────────────────────────────────
router.get('/limit', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('plan');
    const { todayCount, limit, canInterview } = await checkDailyLimit(req.user.id, user.plan);
    res.json({ todayCount, limit, canInterview, plan: user.plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── ROUTE 2: Start interview + generate questions ────────────────────────────
// Now accepts multipart/form-data for optional resume upload
router.post('/start', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('plan name');
    const { canInterview, todayCount, limit } = await checkDailyLimit(req.user.id, user.plan);

    if (!canInterview) {
      return res.status(429).json({
        message: user.plan === 'free'
          ? `Daily limit reached! Free users get 1 interview/day. Upgrade to Premium for 10/day!`
          : `You have completed all 10 interviews for today. Come back tomorrow!`,
        todayCount, limit, limitReached: true
      });
    }

    const { jobRole, jobDescription, techStack, difficultyLevel } = req.body;
    if (!jobRole) return res.status(400).json({ message: 'Job role is required' });

    const techStr = Array.isArray(techStack)
      ? techStack.join(', ')
      : typeof techStack === 'string' && techStack.length > 0
        ? techStack
        : 'General programming';

    const difficulty = difficultyLevel || 'medium';

    // Extract resume text if uploaded
    let resumeText = '';
    if (req.file) {
      console.log('Resume uploaded, extracting text...');
      resumeText = await extractResumeText(req.file);
      console.log(`Resume text extracted: ${resumeText.length} chars`);
    }

    const resumeSection = resumeText
      ? `\nCandidate Resume Summary:\n${resumeText}\n
Use the resume to ask specific questions about their actual projects, technologies they have listed, gaps in their experience, and claims they have made. Make it feel like a real interview where the interviewer has read their CV.`
      : '';

    // ── Code snippet helper instructions ──
    const codeSnippetInstructions = `
For the 2 code snippet questions (positions 9 and 10), format them like this exactly:
- Question 9: Show a code snippet in ${techStr} and ask the candidate to predict the output. Include the code inside the question string using \\n for newlines.
- Question 10: Show a code snippet in ${techStr} that contains a bug and ask the candidate to identify and fix it. Include the code inside the question string.

Example format for a code question:
"What is the output of the following code?\\n\\nconst x = [1,2,3];\\nconsole.log(x.length);\\n\\nExplain your answer."`;

    const prompt = `You are a senior technical interviewer at a top tech company conducting a real job interview.

Candidate is applying for: ${jobRole}
Tech Stack: ${techStr}
Difficulty: ${difficulty}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 300)}` : ''}
${resumeSection}

Generate exactly 12 interview questions following this structure:
- Questions 1-4: Core technical questions about ${techStr} — concepts, architecture, best practices, internals
- Questions 5-6: Problem-solving or system design questions relevant to ${jobRole}
- Questions 7-8: Project and experience based questions (if resume is provided, ask about SPECIFIC projects/technologies mentioned in it)
- Questions 9-10: CODE SNIPPET questions — actual runnable code the candidate must analyze
- Questions 11-12: Behavioral or situational questions

${codeSnippetInstructions}

Rules:
- If a resume is provided, questions 7-8 MUST reference actual project names, technologies, or experiences from the resume
- All questions must be specific, not generic
- Difficulty must match: ${difficulty}
- Code snippets must be valid ${techStr} code that is tricky but fair

IMPORTANT: Return ONLY a valid JSON array of exactly 12 strings. No markdown, no extra text:
["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9_with_code", "q10_with_code", "q11", "q12"]`;

    let questionsArr = [];

    try {
      console.log('Generating 12 questions via Groq...');
      const groqResponse = await callGroq(prompt);
      console.log('Groq raw response:', groqResponse.substring(0, 300));

      const parsed = safeParseJSON(groqResponse);

      if (Array.isArray(parsed) && parsed.length >= 8) {
        questionsArr = parsed.filter(q => typeof q === 'string' && q.trim().length > 10);
        console.log(`${questionsArr.length} questions generated successfully!`);
      } else {
        throw new Error('Invalid questions format from Groq');
      }
    } catch (e) {
      console.error('Groq questions error:', e.message);
      questionsArr = [
        `Explain the core architecture and fundamental concepts of ${techStr}. How do they apply in ${jobRole} work?`,
        `What are the most common performance bottlenecks in ${techStr} and how do you address them?`,
        `Describe best practices you follow when working with ${techStr} in production.`,
        `What are the key differences between ${techStr} and its alternatives? When would you choose each?`,
        `How would you design a scalable system for a high-traffic application using ${techStr}?`,
        `You encounter a critical bug in production involving ${techStr}. Walk me through your debugging process.`,
        resumeText
          ? `Based on your resume, tell me about the most complex project you built. What were the key technical challenges?`
          : `Describe the most complex project you have worked on using ${techStr}. What was your specific contribution?`,
        `Tell me about a time you had to make a difficult technical decision. What was the outcome and what did you learn?`,
        `What is the output of the following JavaScript code?\n\nconst a = [1, 2, 3];\nconst b = a;\nb.push(4);\nconsole.log(a.length);\n\nExplain why.`,
        `Find the bug in this code and fix it:\n\nasync function fetchData() {\n  const res = fetch('https://api.example.com/data');\n  const json = res.json();\n  return json;\n}\n\nWhat is wrong and how would you correct it?`,
        `Tell me about a time you disagreed with a teammate on a technical approach. How did you resolve it?`,
        `Where do you see yourself growing as a ${jobRole} in the next two years?`
      ];
    }

    questionsArr = questionsArr.slice(0, 12);
    while (questionsArr.length < 12) {
      questionsArr.push(`Share your experience and approach to challenges in the ${jobRole} role.`);
    }

    const interview = new Interview({
      user: req.user.id,
      jobRole,
      jobDescription: jobDescription || '',
      techStack: Array.isArray(techStack) ? techStack : techStack ? [techStack] : [],
      difficultyLevel: difficulty,
      resumeUploaded: !!resumeText,
      questions: questionsArr.map((q, i) => ({
        questionText: q,
        // Mark code snippet questions for frontend rendering
        isCodeQuestion: i === 8 || i === 9
      })),
      interviewDate: new Date().toISOString().split('T')[0]
    });

    await interview.save();
    console.log('Interview saved:', interview._id);

    res.status(201).json({
      interview: {
        _id: interview._id,
        jobRole: interview.jobRole,
        difficultyLevel: interview.difficultyLevel,
        resumeUploaded: interview.resumeUploaded,
        questions: interview.questions.map((q, i) => ({
          index: i,
          questionText: q.questionText,
          isCodeQuestion: q.isCodeQuestion
        }))
      },
      message: 'Interview started! All the best!'
    });
  } catch (error) {
    console.error('Start interview error:', error.message);
    res.status(500).json({ message: 'Could not start interview: ' + error.message });
  }
});

// ─── ROUTE 3: Submit answer + get AI feedback ─────────────────────────────────
router.post('/:id/answer', verifyToken, async (req, res) => {
  try {
    const { questionIndex, userAnswer, timeSpent } = req.body;

    if (userAnswer === undefined || questionIndex === undefined) {
      return res.status(400).json({ message: 'questionIndex and userAnswer are required' });
    }

    const interview = await Interview.findOne({ _id: req.params.id, user: req.user.id });
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (interview.status === 'completed') return res.status(400).json({ message: 'Interview is already completed' });

    const question = interview.questions[questionIndex];
    if (!question) return res.status(400).json({ message: 'Invalid question index' });

    let aiFeedback = '';
    let score = 0; // Default to 0, not 5

    const answerText = userAnswer.trim();
    const isCodeQuestion = question.isCodeQuestion || false;

    // ── Strict skip / empty handling ──────────────────────────────────────────
    if (answerText === '(Skipped)') {
      aiFeedback = 'Question was skipped. In a real interview, skipping without any attempt significantly hurts your chances.';
      score = 0;
      interview.questions[questionIndex].userAnswer = answerText;
      interview.questions[questionIndex].aiFeedback = aiFeedback;
      interview.questions[questionIndex].score = score;
      interview.questions[questionIndex].timeSpent = timeSpent || 0;
      await interview.save();
      return res.json({ questionIndex, score, aiFeedback, message: 'Answer saved.' });
    }

    if (answerText.length < 5) {
      aiFeedback = 'Answer was too short to evaluate. A real interviewer would consider this a non-answer.';
      score = 0;
      interview.questions[questionIndex].userAnswer = answerText;
      interview.questions[questionIndex].aiFeedback = aiFeedback;
      interview.questions[questionIndex].score = score;
      interview.questions[questionIndex].timeSpent = timeSpent || 0;
      await interview.save();
      return res.json({ questionIndex, score, aiFeedback, message: 'Answer saved.' });
    }

    // ── Detect "I don't know" type answers ────────────────────────────────────
    const dontKnowPatterns = [
      /^i\s*(don'?t|do\s*not)\s*know/i,
      /^(not sure|no idea|idk|dunno|i have no idea)/i,
      /^(i'?m?\s*not\s*sure|i\s*can'?t\s*answer|i\s*don'?t\s*remember)/i,
      /^(skip|pass|next|nothing|none|no|nope|na|n\/a)$/i
    ];

    const isDontKnow = dontKnowPatterns.some(p => p.test(answerText)) || answerText.length < 15;

    if (isDontKnow) {
      // Still send to AI so it gives proper guidance, but cap score at 1
      try {
        const feedbackPrompt = `You are a strict technical interviewer. The candidate answered a question with essentially "I don't know" or gave a non-answer.

Question: ${question.questionText}
Candidate's Answer: "${answerText}"

Give them a score of 0 or 1 out of 10 only. Explain briefly what the correct answer should have been, so the candidate learns.

Return ONLY valid JSON:
{"score": 0, "feedback": "Candidate did not answer. The correct answer is: [brief correct answer]", "good": "N/A", "improve": "Study this topic before your next interview"}`;

        const feedbackResponse = await callGroq(feedbackPrompt);
        const parsed = safeParseJSON(feedbackResponse);

        if (parsed && typeof parsed.score === 'number') {
          score = Math.min(1, Math.max(0, Math.round(parsed.score))); // Hard cap at 1
          aiFeedback = [
            parsed.feedback || 'No meaningful answer provided.',
            parsed.improve ? `💡 ${parsed.improve}` : ''
          ].filter(Boolean).join(' ');
        } else {
          score = 0;
          aiFeedback = 'No meaningful answer was provided. Review this topic before your next interview.';
        }
      } catch {
        score = 0;
        aiFeedback = 'No meaningful answer was provided. Review this topic and try again.';
      }

      interview.questions[questionIndex].userAnswer = answerText;
      interview.questions[questionIndex].aiFeedback = aiFeedback;
      interview.questions[questionIndex].score = score;
      interview.questions[questionIndex].timeSpent = timeSpent || 0;
      await interview.save();
      return res.json({ questionIndex, score, aiFeedback, message: 'Answer saved.' });
    }

    // ── Full AI Evaluation ────────────────────────────────────────────────────
    try {
      const codeEvalNote = isCodeQuestion
        ? `This is a code analysis question. Evaluate strictly:
- For output prediction: is the predicted output exactly correct? Even minor mistakes should cost points.
- For bug finding: did they identify the exact bug and provide a correct fix?
- Partial credit only if they identified the concept but missed specifics.`
        : '';

      const feedbackPrompt = `You are a strict senior technical interviewer at a top tech company. Evaluate this answer as you would in a real interview — do not be lenient.

Role: ${interview.jobRole}
Tech Stack: ${interview.techStack?.join(', ') || 'General'}
Difficulty: ${interview.difficultyLevel}
${codeEvalNote}

Question: ${question.questionText}

Candidate's Answer: "${answerText}"

Scoring rubric (be strict — most answers should score 4-7, not 8-10):
- 0: No answer, "I don't know", completely wrong, or irrelevant
- 1-2: Severely lacking — misses core concept entirely, major misconceptions
- 3-4: Weak — some awareness but mostly incorrect or incomplete, would not pass a real interview
- 5-6: Average — partially correct, understands basics but lacks depth or has notable gaps
- 7-8: Good — correct and reasonably complete, minor gaps only, would likely pass
- 9: Very strong — detailed, accurate, shows real experience, near-perfect
- 10: Exceptional — covers all aspects including edge cases, exactly what a senior would say

Key rules:
- "I don't know" or empty answers MUST score 0
- Vague or buzzword-only answers score 2-3 maximum
- Short answers (under 30 words) for technical questions score 4 maximum unless the question itself is simple
- Only give 8+ if the answer is genuinely impressive and complete

Return ONLY valid JSON, no markdown:
{"score": 5, "feedback": "2-3 sentence honest assessment of their answer", "good": "Specific thing they got right (or 'Nothing notable' if weak)", "improve": "Specific most important thing they must improve or study"}`;

      const feedbackResponse = await callGroq(feedbackPrompt);
      console.log(`Q${questionIndex + 1} feedback raw:`, feedbackResponse.substring(0, 200));

      const parsed = safeParseJSON(feedbackResponse);

      if (parsed && typeof parsed.score === 'number') {
        score = Math.min(10, Math.max(0, Math.round(parsed.score)));
        aiFeedback = [
          parsed.feedback || '',
          parsed.good && parsed.good !== 'Nothing notable' ? `✅ ${parsed.good}` : '',
          parsed.improve ? `💡 ${parsed.improve}` : ''
        ].filter(Boolean).join(' ');
      } else {
        throw new Error('Invalid feedback format from Groq');
      }

      console.log(`Q${questionIndex + 1} score: ${score}/10`);
    } catch (e) {
      console.error('Feedback generation error:', e.message);
      // Strict length-based fallback (no more free 4s)
      if (answerText.length > 300) score = 5;
      else if (answerText.length > 150) score = 4;
      else if (answerText.length > 50) score = 3;
      else score = 1;
      aiFeedback = `Answer recorded but could not be fully evaluated. ${answerText.length > 150 ? 'Answer has reasonable length.' : 'Try to elaborate more in your answers.'} Keep practicing!`;
    }

    interview.questions[questionIndex].userAnswer = answerText;
    interview.questions[questionIndex].aiFeedback = aiFeedback;
    interview.questions[questionIndex].score = score;
    interview.questions[questionIndex].timeSpent = timeSpent || 0;

    await interview.save();

    res.json({ questionIndex, score, aiFeedback, message: 'Answer saved successfully!' });
  } catch (error) {
    console.error('Answer submit error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── ROUTE 4: Complete interview + overall feedback ───────────────────────────
router.post('/:id/complete', verifyToken, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user.id });
    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    if (interview.status === 'completed') {
      return res.json({ interview });
    }

    const answeredQs = interview.questions.filter(
      q => q.userAnswer && q.userAnswer.trim() && q.userAnswer !== '(Skipped)'
    );
    const allQs = interview.questions;

    // Average score across ALL 12 questions (skipped = 0)
    const totalScore = Math.round(
      allQs.reduce((sum, q) => sum + (q.score || 0), 0) / allQs.length * 10
    );

    let overallFeedback = '';
    let strengths = [];
    let improvements = [];

    try {
      const qaSummary = allQs.map((q, i) =>
        `Q${i + 1}${q.isCodeQuestion ? ' [CODE]' : ''}: ${q.questionText.substring(0, 120)}\nAnswer: ${q.userAnswer || '(no answer)'}\nScore: ${q.score || 0}/10`
      ).join('\n\n');

      const overallPrompt = `You are a senior technical interviewer writing a post-interview evaluation report.

Candidate applied for: ${interview.jobRole}
Tech Stack: ${interview.techStack?.join(', ') || 'General'}
Difficulty: ${interview.difficultyLevel}
Resume Uploaded: ${interview.resumeUploaded ? 'Yes' : 'No'}
Overall Score: ${totalScore}/100
Questions Attempted: ${answeredQs.length}/12

Interview Transcript:
${qaSummary}

Write an honest, specific evaluation. Reference actual answers. Do not be vague.

Return ONLY valid JSON:
{
  "overallFeedback": "3-4 sentence honest overall assessment referencing specific answers and performance patterns",
  "strengths": ["Specific strength with example from their answers", "Another specific strength", "Third strength"],
  "improvements": ["Most critical gap with specific advice", "Second improvement area", "Third improvement area"],
  "verdict": "Strong Hire / Potential Hire / Needs More Preparation / Not Ready"
}`;

      const overallResponse = await callGroq(overallPrompt);
      const parsed = safeParseJSON(overallResponse);

      if (parsed && parsed.overallFeedback) {
        overallFeedback = parsed.verdict
          ? `${parsed.overallFeedback} | Verdict: ${parsed.verdict}`
          : parsed.overallFeedback;
        strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
        improvements = Array.isArray(parsed.improvements) ? parsed.improvements : [];
      } else {
        throw new Error('Invalid overall feedback format');
      }
    } catch (e) {
      console.error('Overall feedback error:', e.message);
      overallFeedback = `You scored ${totalScore}/100 across 12 questions. ${
        totalScore >= 70 ? 'Strong performance overall!' :
        totalScore >= 50 ? 'Average performance. Focused practice needed.' :
        'Significant preparation required before interviewing.'
      }`;
      strengths = [
        `Attempted ${answeredQs.length} out of 12 questions`,
        'Completed a full-length technical interview',
        'Identified areas for growth'
      ];
      improvements = [
        'Add technical depth and specifics to your answers',
        'Practice code reading and output prediction',
        `Deep dive into ${interview.techStack?.[0] || interview.jobRole} fundamentals`
      ];
    }

    interview.status = 'completed';
    interview.totalScore = totalScore;
    interview.overallFeedback = overallFeedback;
    interview.strengths = strengths;
    interview.improvements = improvements;
    interview.completedAt = new Date();

    await interview.save();
    console.log('Interview completed! Score:', totalScore);

    res.json({ interview, message: 'Interview completed successfully!' });
  } catch (error) {
    console.error('Complete interview error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─── ROUTE 5: Interview history ───────────────────────────────────────────────
router.get('/history', verifyToken, async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user.id })
      .select('jobRole difficultyLevel totalScore status interviewDate createdAt questions resumeUploaded')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── ROUTE 6: Single interview detail ────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user.id });
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    res.json(interview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── ROUTE 7: Abandon interview ───────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Interview.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { status: 'abandoned' }
    );
    res.json({ message: 'Interview abandoned' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
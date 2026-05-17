import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import API from '../api';

// ─── API calls ────────────────────────────────────────────────────────────────
const getInterviewLimit  = ()         => API.get('/interview/limit');
const submitAnswer       = (id, data) => API.post(`/interview/${id}/answer`, data);
const completeInterview  = (id)       => API.post(`/interview/${id}/complete`);
const getHistory         = ()         => API.get('/interview/history');
const getInterviewDetail = (id)       => API.get(`/interview/${id}`);
const abandonInterview   = (id)       => API.delete(`/interview/${id}`);

// startInterview now sends multipart/form-data for optional resume
const startInterview = (formData) =>
  API.post('/interview/start', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

// ─── Speech helpers ───────────────────────────────────────────────────────────
const speak = (text, onEnd) => {
  window.speechSynthesis.cancel();
  // Strip code blocks before speaking — don't read raw code aloud
  const cleanText = text.replace(/```[\s\S]*?```/g, 'a code snippet').replace(/`[^`]+`/g, 'code');
  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.rate = 0.92;
  utter.pitch = 1;
  utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.lang === 'en-US');
  if (preferred) utter.voice = preferred;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
};

const stopSpeaking = () => window.speechSynthesis.cancel();

// ─── Score color helpers ──────────────────────────────────────────────────────
const scoreColor = (score, max = 10) => {
  const pct = (score / max) * 100;
  if (pct >= 70) return 'text-green-600';
  if (pct >= 40) return 'text-yellow-600';
  return 'text-red-500';
};

const scoreBg = (score) => {
  if (score >= 7) return 'bg-green-100 text-green-800';
  if (score >= 4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

// ─── Code block renderer ──────────────────────────────────────────────────────
// Splits questionText into text parts and code parts and renders them separately
const QuestionText = ({ text, isCodeQuestion }) => {
  if (!isCodeQuestion) {
    return <p className="text-gray-800 font-medium leading-relaxed">{text}</p>;
  }

  // Split on triple-backtick blocks first, then inline backtick blocks
  const parts = [];
  const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If no triple-backtick blocks found, try to detect code by newline patterns
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
    // Look for lines that look like code (contain {, }, =>, const, function, etc.)
    const lines = text.split('\n');
    const codeLinePattern = /const |let |var |function |=>|return |console\.|async |await |if\s*\(|for\s*\(|\{|\}/;
    let inCode = false;
    let currentText = '';
    let currentCode = '';

    lines.forEach(line => {
      if (codeLinePattern.test(line)) {
        if (currentText.trim()) { parts.push({ type: 'text', content: currentText.trim() }); currentText = ''; }
        currentCode += line + '\n';
        inCode = true;
      } else {
        if (inCode && currentCode.trim()) { parts.push({ type: 'code', content: currentCode.trim() }); currentCode = ''; inCode = false; }
        currentText += line + '\n';
      }
    });
    if (currentCode.trim()) parts.push({ type: 'code', content: currentCode.trim() });
    if (currentText.trim()) parts.push({ type: 'text', content: currentText.trim() });
  }

  if (parts.length === 0) {
    return <p className="text-gray-800 font-medium leading-relaxed">{text}</p>;
  }

  return (
    <div className="space-y-3 w-full">
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <div key={i} className="relative">
            <div className="flex items-center gap-2 bg-gray-800 rounded-t-xl px-4 py-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-gray-400 text-xs ml-2 font-mono">code snippet</span>
            </div>
            <pre className="bg-gray-900 text-green-300 rounded-b-xl p-4 text-sm font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {part.content}
            </pre>
          </div>
        ) : (
          <p key={i} className="text-gray-800 font-medium leading-relaxed">{part.content.trim()}</p>
        )
      )}
    </div>
  );
};

// ─── SETUP FORM COMPONENT ─────────────────────────────────────────────────────
const SetupForm = ({ onStart, limitInfo, loading }) => {
  const [form, setForm] = useState({
    jobRole: '',
    jobDescription: '',
    techStack: '',
    difficultyLevel: 'medium'
  });
  const [resumeFile, setResumeFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, TXT, or DOC/DOCX files allowed!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB!');
      return;
    }
    setResumeFile(file);
    toast.success(`Resume uploaded: ${file.name}`);
  };

  const handleSubmit = () => {
    if (!form.jobRole.trim()) { toast.error('Job role is required!'); return; }

    // Build FormData — backend expects multipart now
    const fd = new FormData();
    fd.append('jobRole', form.jobRole.trim());
    fd.append('difficultyLevel', form.difficultyLevel);
    if (form.jobDescription.trim()) fd.append('jobDescription', form.jobDescription.trim());

    // techStack — append each item separately
    const techArr = form.techStack.split(',').map(t => t.trim()).filter(Boolean);
    techArr.forEach(t => fd.append('techStack', t));

    // Resume is optional
    if (resumeFile) fd.append('resume', resumeFile);

    onStart(fd);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Limit Banner */}
      <div className={`mb-6 p-4 rounded-xl border ${limitInfo?.plan === 'premium' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-sm font-semibold ${limitInfo?.plan === 'premium' ? 'text-purple-700' : 'text-blue-700'}`}>
              {limitInfo?.plan === 'premium' ? '⭐ Premium Plan' : '🆓 Free Plan'}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Today's interviews: <strong>{limitInfo?.todayCount || 0}</strong> / <strong>{limitInfo?.limit || 1}</strong>
            </p>
          </div>
          {limitInfo?.plan === 'free' && (
            <a href="/dashboard" className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700">
              ⬆ Upgrade
            </a>
          )}
        </div>
        <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${limitInfo?.plan === 'premium' ? 'bg-purple-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, ((limitInfo?.todayCount || 0) / (limitInfo?.limit || 1)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-5">🎯 Interview Setup</h2>

        <div className="space-y-4">
          {/* Job Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Frontend Developer, Data Analyst, Java Backend"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.jobRole}
              onChange={e => setForm({ ...form, jobRole: e.target.value })}
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tech Stack <span className="text-gray-400 text-xs">(comma separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. React, Node.js, MongoDB, Python"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.techStack}
              onChange={e => setForm({ ...form, techStack: e.target.value })}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-3">
              {['easy', 'medium', 'hard'].map(level => (
                <button
                  key={level}
                  onClick={() => setForm({ ...form, difficultyLevel: level })}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                    form.difficultyLevel === level
                      ? level === 'easy'   ? 'bg-green-100 border-green-400 text-green-700'
                      : level === 'medium' ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                      :                     'bg-red-100 border-red-400 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {level === 'easy' ? '😊 Easy' : level === 'medium' ? '🤔 Medium' : '🔥 Hard'}
                </button>
              ))}
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description{' '}
              <span className="text-gray-400 text-xs">(optional — better questions)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Paste job description for more relevant questions..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              value={form.jobDescription}
              onChange={e => setForm({ ...form, jobDescription: e.target.value })}
            />
          </div>

          {/* ── Resume Upload ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resume Upload{' '}
              <span className="text-gray-400 text-xs">(optional — personalised questions from your CV)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-xl px-4 py-5 text-center transition-all ${
                resumeFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              {resumeFile ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-green-700">{resumeFile.name}</p>
                    <p className="text-xs text-green-500">
                      {(resumeFile.size / 1024).toFixed(1)} KB — Click to change
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none"
                    title="Remove resume"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-2xl mb-1">📎</p>
                  <p className="text-sm text-gray-500 font-medium">Click to upload your resume</p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, DOC, DOCX, TXT — max 5MB</p>
                </div>
              )}
            </div>
            {resumeFile && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <span>✅</span> AI will ask specific questions about your projects and experience
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !limitInfo?.canInterview}
          className={`mt-6 w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
            !limitInfo?.canInterview
              ? 'bg-gray-300 cursor-not-allowed'
              : loading
                ? 'bg-indigo-400 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
          }`}
        >
          {loading
            ? '⏳ Generating AI questions...'
            : !limitInfo?.canInterview
              ? `🚫 Daily limit reached (${limitInfo?.todayCount}/${limitInfo?.limit})`
              : `🚀 Start Interview${resumeFile ? ' with Resume' : ''}`}
        </button>

        {!limitInfo?.canInterview && limitInfo?.plan === 'free' && (
          <p className="text-center text-xs text-gray-500 mt-3">
            Come back tomorrow, or{' '}
            <a href="/dashboard" className="text-indigo-600 underline">upgrade to Premium</a>{' '}
            for 10 interviews/day!
          </p>
        )}
      </div>
    </div>
  );
};

// ─── INTERVIEW SESSION COMPONENT ──────────────────────────────────────────────
const InterviewSession = ({ interview, onComplete, onAbandon }) => {
  const [currentQ, setCurrentQ]     = useState(0);
  const [phase, setPhase]           = useState('speaking'); // speaking | listening | processing | done_q
  const [transcript, setTranscript] = useState('');
  const [answers, setAnswers]       = useState({});
  const [timer, setTimer]           = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef       = useRef(null);
  const startTimeRef   = useRef(null);

  const questions = interview.questions;
  const totalQs   = questions.length;
  const currentQuestion = questions[currentQ];
  const isCodeQ = currentQuestion?.isCodeQuestion || false;

  // ── Timer ──
  useEffect(() => {
    if (phase === 'listening') {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Speak question ──
  useEffect(() => {
    if (phase === 'speaking' && currentQ < totalQs) {
      const q = questions[currentQ];
      const intro = currentQ === 0
        ? `Interview is starting! Question number ${currentQ + 1}: ${q.questionText}`
        : `Next question, number ${currentQ + 1}: ${q.questionText}`;
      setTimer(0);
      speak(intro, () => {
        setPhase('listening');
        startListening();
      });
    }
    // eslint-disable-next-line
  }, [phase, currentQ]);

  // ── Speech Recognition ──
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported! Use Chrome.');
      setPhase('listening');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t + ' ';
        else interim += t;
      }
      setTranscript(finalTranscript + interim);
    };
    recognition.onerror = (e) => { if (e.error !== 'no-speech') console.log('STT error:', e.error); };
    recognition.onend   = () => {};

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
  };

  // ── Submit Answer ──
  const handleSubmitAnswer = async () => {
    stopListening();
    stopSpeaking();

    const finalAnswer = transcript.trim();
    const timeSpent = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : timer;

    if (!finalAnswer) {
      toast.warning('No answer detected! Try again or skip.');
      return;
    }

    setIsSubmitting(true);
    setPhase('processing');

    try {
      const res = await submitAnswer(interview._id, {
        questionIndex: currentQ,
        userAnswer: finalAnswer,
        timeSpent
      });

      setAnswers(prev => ({
        ...prev,
        [currentQ]: { answer: finalAnswer, feedback: res.data.aiFeedback, score: res.data.score }
      }));

      speak(`Score: ${res.data.score} out of 10. ${res.data.aiFeedback?.split('.')[0] || ''}`, () => {
        setPhase('done_q');
      });
    } catch (e) {
      toast.error('Answer could not be submitted: ' + (e.response?.data?.message || e.message));
      setPhase('listening');
      startListening();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Skip ──
  const handleSkip = async () => {
    stopListening();
    stopSpeaking();
    setIsSubmitting(true);
    try {
      await submitAnswer(interview._id, { questionIndex: currentQ, userAnswer: '(Skipped)', timeSpent: 0 });
      setAnswers(prev => ({ ...prev, [currentQ]: { answer: '(Skipped)', feedback: 'Question skipped.', score: 0 } }));
    } catch (e) { console.log('Skip error', e); }
    setIsSubmitting(false);
    goNext();
  };

  const goNext = useCallback(() => {
    setTranscript('');
    setTimer(0);
    if (currentQ + 1 < totalQs) {
      setCurrentQ(q => q + 1);
      setPhase('speaking');
    } else {
      onComplete(answers);
    }
  // eslint-disable-next-line
  }, [currentQ, totalQs, answers]);

  useEffect(() => {
    if (phase === 'done_q') {
      const t = setTimeout(goNext, 3500);
      return () => clearTimeout(t);
    }
  }, [phase, goNext]);

  useEffect(() => { return () => { stopListening(); stopSpeaking(); }; }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-800">
              🎙️ {interview.jobRole}
              {interview.resumeUploaded && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-normal">📄 Resume</span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">
              {interview.difficultyLevel} difficulty • {totalQs} questions
            </p>
          </div>
          <button
            onClick={() => { stopListening(); stopSpeaking(); onAbandon(); }}
            className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg"
          >
            End Interview
          </button>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {questions.map((q, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < currentQ       ? 'bg-green-400'
                : i === currentQ   ? 'bg-indigo-500'
                : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Question {currentQ + 1} of {totalQs}</p>
      </div>

      {/* Question Card */}
      <div className={`bg-white rounded-2xl shadow-sm p-6 mb-4 ${
        isCodeQ ? 'border-2 border-indigo-200' : 'border border-indigo-100'
      }`}>
        {/* Code question badge */}
        {isCodeQ && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-medium">
              {currentQ === 8 ? '💻 Output Prediction' : '🐛 Bug Finding'}
            </span>
            <span className="text-xs text-gray-400">
              {currentQ === 8
                ? 'Read the code carefully and predict the output'
                : 'Find the bug and explain how to fix it'}
            </span>
          </div>
        )}

        <div className="flex items-start gap-3 mb-4">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
            isCodeQ ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
          }`}>
            {currentQ + 1}
          </div>
          <div className="flex-1 min-w-0">
            <QuestionText
              text={currentQuestion?.questionText || ''}
              isCodeQuestion={isCodeQ}
            />
          </div>
        </div>

        {/* Phase indicator */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
          phase === 'speaking'     ? 'bg-blue-50 text-blue-700'
          : phase === 'listening'  ? 'bg-red-50 text-red-700'
          : phase === 'processing' ? 'bg-yellow-50 text-yellow-700'
          : 'bg-green-50 text-green-700'
        }`}>
          {phase === 'speaking'    && <><span className="animate-pulse">🔊</span> AI is reading the question...</>}
          {phase === 'listening'   && (
            <>
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              Listening... ({timer}s)
              <span className="ml-auto text-xs opacity-70">Click Submit when done</span>
            </>
          )}
          {phase === 'processing'  && <><span className="animate-spin inline-block">⚙️</span> AI is evaluating your answer...</>}
          {phase === 'done_q'      && <><span>✅</span> Next question in 3 seconds...</>}
        </div>

        {/* Live transcript */}
        {(phase === 'listening' || phase === 'processing' || phase === 'done_q') && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1.5">Your answer:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[80px] text-sm text-gray-700 leading-relaxed">
              {transcript || <span className="text-gray-400 italic">Start speaking...</span>}
            </div>
            {phase === 'listening' && (
              <>
                <p className="text-xs text-gray-400 mt-1.5">Mic not working? Type below:</p>
                <textarea
                  className="w-full mt-1.5 border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  rows={isCodeQ ? 3 : 2}
                  placeholder={isCodeQ
                    ? 'Type your answer here (e.g. "Output is 4, because...")'
                    : 'Type your answer here as backup...'}
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                />
              </>
            )}
          </div>
        )}

        {/* AI Feedback */}
        {phase === 'done_q' && answers[currentQ] && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-bold ${scoreColor(answers[currentQ].score)}`}>
                {answers[currentQ].score}/10
              </span>
              <span className="text-xs text-gray-500">AI Feedback:</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{answers[currentQ].feedback}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {phase === 'listening' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="py-3 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
          >
            ⏭ Skip Question
          </button>
          <button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || !transcript.trim()}
            className={`py-3 rounded-xl text-sm font-semibold text-white transition-all ${
              !transcript.trim() ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? '⏳ Processing...' : '✅ Submit Answer'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── RESULTS COMPONENT ────────────────────────────────────────────────────────
const InterviewResults = ({ interviewId, onNewInterview }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    completeInterview(interviewId)
      .then(res => setResult(res.data.interview))
      .catch(e => toast.error('Could not load result: ' + e.message))
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      <p className="text-gray-500 text-sm">Generating overall feedback...</p>
    </div>
  );

  if (!result) return <div className="text-center py-20 text-gray-400">Result not found 😕</div>;

  const score = result.totalScore;
  const grade = score >= 80 ? { label: 'Excellent! 🏆', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
    : score >= 60 ? { label: 'Good Job! 👍',            color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' }
    : score >= 40 ? { label: 'Keep Practicing 💪',      color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
    : {             label: 'Needs Improvement 📚',      color: 'text-red-600',    bg: 'bg-red-50 border-red-200' };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Score Card */}
      <div className={`rounded-2xl border p-6 mb-4 text-center ${grade.bg}`}>
        <div className={`text-5xl font-bold ${grade.color} mb-1`}>
          {score}<span className="text-2xl">/100</span>
        </div>
        <div className={`text-xl font-semibold ${grade.color} mb-2`}>{grade.label}</div>
        {result.resumeUploaded && (
          <p className="text-xs text-gray-400 mb-2">📄 Resume-based personalised interview</p>
        )}
        <p className="text-sm text-gray-600 leading-relaxed">{result.overallFeedback}</p>
      </div>

      {/* Per-question breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h3 className="font-semibold text-gray-800 mb-4">📊 Question-wise Breakdown</h3>
        <div className="space-y-3">
          {result.questions.map((q, i) => (
            <div key={i} className={`border rounded-xl p-3 ${q.isCodeQuestion ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${scoreBg(q.score)}`}>
                    {q.score}/10
                  </span>
                  {q.isCodeQuestion && (
                    <span className="text-xs text-indigo-500">💻</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 mb-1 line-clamp-2">{q.questionText}</p>
                  {q.userAnswer && q.userAnswer !== '(Skipped)' && (
                    <p className="text-xs text-gray-500 mb-1.5 truncate">
                      <span className="font-medium">Your answer:</span> {q.userAnswer}
                    </p>
                  )}
                  {q.userAnswer === '(Skipped)' && (
                    <p className="text-xs text-red-400 mb-1.5">⏭ Skipped</p>
                  )}
                  {q.aiFeedback && (
                    <p className="text-xs text-gray-600 leading-relaxed">{q.aiFeedback}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <h3 className="font-semibold text-green-800 mb-3">💪 Strengths</h3>
          <ul className="space-y-1.5">
            {(result.strengths || []).map((s, i) => (
              <li key={i} className="text-sm text-green-700 flex gap-2"><span>✓</span>{s}</li>
            ))}
          </ul>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <h3 className="font-semibold text-orange-800 mb-3">📈 Improvements</h3>
          <ul className="space-y-1.5">
            {(result.improvements || []).map((s, i) => (
              <li key={i} className="text-sm text-orange-700 flex gap-2"><span>→</span>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
        >
          🏠 Dashboard
        </button>
        <button
          onClick={onNewInterview}
          className="py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold text-white"
        >
          🔄 New Interview
        </button>
      </div>
    </div>
  );
};

// ─── HISTORY DETAIL COMPONENT ────────────────────────────────────────────────
const HistoryDetail = ({ interviewId, onBack }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInterviewDetail(interviewId)
      .then(res => setDetail(res.data))
      .catch(() => toast.error('Could not load interview detail'))
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      <p className="text-gray-500 text-sm">Loading interview details...</p>
    </div>
  );

  if (!detail) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-4xl mb-3">😕</p>
      <p>Could not load this interview.</p>
      <button onClick={onBack} className="mt-4 text-indigo-600 text-sm underline">← Go back</button>
    </div>
  );

  const score = detail.totalScore;
  const grade = score >= 80 ? { label: 'Excellent! 🏆', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
    : score >= 60 ? { label: 'Good Job! 👍',            color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' }
    : score >= 40 ? { label: 'Keep Practicing 💪',      color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
    : {             label: 'Needs Improvement 📚',      color: 'text-red-600',    bg: 'bg-red-50 border-red-200' };

  const statusBadge = detail.status === 'completed'
    ? 'bg-green-100 text-green-700'
    : detail.status === 'abandoned'
    ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          ← Back to History
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">{detail.jobRole}</h2>
            <p className="text-xs text-gray-400 mt-1 capitalize">
              {detail.difficultyLevel} difficulty • {detail.questions?.length || 0} questions •{' '}
              {new Date(detail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${statusBadge}`}>
                {detail.status}
              </span>
              {detail.resumeUploaded && (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-medium">
                  📄 Resume Used
                </span>
              )}
              {detail.techStack?.length > 0 && detail.techStack.map((t, i) => (
                <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                  {t}
                </span>
              ))}
            </div>
          </div>
          {detail.status === 'completed' && (
            <div className={`shrink-0 rounded-xl border px-4 py-3 text-center ${grade.bg}`}>
              <div className={`text-2xl font-bold ${grade.color}`}>{score}</div>
              <div className="text-xs text-gray-500">/100</div>
            </div>
          )}
        </div>
      </div>

      {/* Overall feedback — only for completed */}
      {detail.status === 'completed' && detail.overallFeedback && (
        <div className={`rounded-2xl border p-4 mb-4 ${grade.bg}`}>
          <p className={`text-sm font-semibold ${grade.color} mb-1`}>{grade.label}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{detail.overallFeedback}</p>
        </div>
      )}

      {/* Strengths & Improvements */}
      {detail.status === 'completed' && (detail.strengths?.length > 0 || detail.improvements?.length > 0) && (
        <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
          {detail.strengths?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <h3 className="font-semibold text-green-800 mb-3">💪 Strengths</h3>
              <ul className="space-y-1.5">
                {detail.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-700 flex gap-2"><span>✓</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {detail.improvements?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <h3 className="font-semibold text-orange-800 mb-3">📈 Improvements</h3>
              <ul className="space-y-1.5">
                {detail.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-orange-700 flex gap-2"><span>→</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Q&A Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h3 className="font-semibold text-gray-800 mb-4">
          📊 Question-wise Breakdown
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({detail.questions?.filter(q => q.userAnswer && q.userAnswer !== '(Skipped)').length || 0}/{detail.questions?.length || 0} answered)
          </span>
        </h3>
        <div className="space-y-3">
          {(detail.questions || []).map((q, i) => (
            <div key={i} className={`border rounded-xl p-3 ${q.isCodeQuestion ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${scoreBg(q.score || 0)}`}>
                    {q.score ?? 0}/10
                  </span>
                  {q.isCodeQuestion && <span className="text-xs text-indigo-500">💻</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Q{i + 1}</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">{q.questionText}</p>
                  {q.userAnswer && q.userAnswer !== '(Skipped)' ? (
                    <div className="bg-gray-50 rounded-lg p-2 mb-1.5">
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Your answer:</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{q.userAnswer}</p>
                    </div>
                  ) : q.userAnswer === '(Skipped)' ? (
                    <p className="text-xs text-red-400 mb-1.5">⏭ Skipped</p>
                  ) : (
                    <p className="text-xs text-gray-300 mb-1.5 italic">No answer recorded</p>
                  )}
                  {q.aiFeedback && (
                    <p className="text-xs text-gray-600 leading-relaxed border-l-2 border-indigo-200 pl-2">
                      {q.aiFeedback}
                    </p>
                  )}
                  {q.timeSpent > 0 && (
                    <p className="text-xs text-gray-300 mt-1">⏱ {q.timeSpent}s</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── HISTORY LIST COMPONENT ───────────────────────────────────────────────────
const InterviewHistory = ({ onClose, onViewDetail }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then(res => setHistory(res.data))
      .catch(() => toast.error('Could not load history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <h2 className="text-lg font-bold text-gray-800">📜 Interview History</h2>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎙️</p>
          <p>No interviews yet!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(h => (
            <div
              key={h._id}
              onClick={() => onViewDetail(h._id)}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                h.status === 'completed' ? scoreBg(h.totalScore / 10) : 'bg-gray-100 text-gray-500'
              }`}>
                {h.status === 'completed' ? h.totalScore : '—'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800 truncate">{h.jobRole}</p>
                  {h.resumeUploaded && <span className="text-xs text-green-600">📄</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {h.difficultyLevel} • {h.questions?.length || 0} questions •{' '}
                  {new Date(h.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${
                  h.status === 'completed'   ? 'bg-green-100 text-green-700'
                  : h.status === 'abandoned' ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {h.status}
                </span>
                <span className="text-gray-300 text-sm">›</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const MockInterview = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [view, setView]                       = useState('setup');
  const [limitInfo, setLimitInfo]             = useState(null);
  const [activeInterview, setActiveInterview] = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [completedId, setCompletedId]         = useState(null);
  const [historyDetailId, setHistoryDetailId] = useState(null);

  useEffect(() => {
    getInterviewLimit()
      .then(res => setLimitInfo(res.data))
      .catch(() => toast.error('Could not load limit info'));
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) {
      toast.warning('Speech synthesis not supported. Running in text mode.', { autoClose: 5000 });
    }
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
      toast.warning('Use Chrome for speech recognition support!', { autoClose: 5000 });
    }
  }, []);

  // ── handleStart now receives a FormData object directly from SetupForm ──
  const handleStart = async (formData) => {
    setLoading(true);
    try {
      const res = await startInterview(formData);
      setActiveInterview(res.data.interview);
      setView('interview');
      const lim = await getInterviewLimit();
      setLimitInfo(lim.data);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      if (e.response?.status === 429) {
        toast.error(msg, { autoClose: 6000 });
        getInterviewLimit().then(r => setLimitInfo(r.data)).catch(() => {});
      } else {
        toast.error('Could not start interview: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    setCompletedId(activeInterview._id);
    setView('results');
  };

  const handleAbandon = async () => {
    if (activeInterview) {
      try { await abandonInterview(activeInterview._id); } catch (e) {}
    }
    setActiveInterview(null);
    setHistoryDetailId(null);
    setView('setup');
    getInterviewLimit().then(r => setLimitInfo(r.data)).catch(() => {});
  };

  const handleNewInterview = () => {
    setActiveInterview(null);
    setCompletedId(null);
    setHistoryDetailId(null);
    setView('setup');
    getInterviewLimit().then(r => setLimitInfo(r.data)).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600">←</button>
            <div>
              <h1 className="font-bold text-gray-800 text-base">🎙️ Mock Interview</h1>
              <p className="text-xs text-gray-400">AI-powered voice interview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view !== 'history' && view !== 'interview' && (
              <button
                onClick={() => setView('history')}
                className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
              >
                📜 History
              </button>
            )}
            {user && (
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                user.plan === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {user.plan === 'premium' ? '⭐ Premium' : '🆓 Free'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === 'setup' && (
          <SetupForm onStart={handleStart} limitInfo={limitInfo} loading={loading} />
        )}
        {view === 'interview' && activeInterview && (
          <InterviewSession
            interview={activeInterview}
            onComplete={handleComplete}
            onAbandon={handleAbandon}
          />
        )}
        {view === 'results' && completedId && (
          <InterviewResults interviewId={completedId} onNewInterview={handleNewInterview} />
        )}
        {view === 'history' && !historyDetailId && (
          <InterviewHistory
            onClose={() => setView('setup')}
            onViewDetail={(id) => setHistoryDetailId(id)}
          />
        )}
        {view === 'history' && historyDetailId && (
          <HistoryDetail
            interviewId={historyDetailId}
            onBack={() => setHistoryDetailId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default MockInterview;
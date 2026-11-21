'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Code2,
  Clock,
  Award,
  RotateCcw,
  History,
  Send,
  Crown,
  Trophy,
  Target,
  SkipForward,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import UpgradeModal from '@/components/features/UpgradeModal';
import { Button, Badge, Card, Spinner } from '@/components/ui/UI';
import { useAuth } from '@/context/AuthContext';
import {
  getInterviewLimit,
  startInterview,
  submitAnswer,
  completeInterview,
  getInterviewHistory,
  getInterviewDetail,
  abandonInterview,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';

const ROLE_PRESETS = [
  'Full-Stack Developer',
  'Frontend Engineer',
  'Backend Engineer',
  'Data Analyst',
  'Java Developer',
  'Python Developer',
  'DevOps Engineer',
];

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function MockInterviewPage() {
  const { user, refreshUser } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [phase, setPhase] = useState('setup');
  const [loadingInit, setLoadingInit] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submittingAns, setSubmittingAns] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Limit & History
  const [limitInfo, setLimitInfo] = useState(null);
  const [history, setHistory] = useState([]);

  // Setup Form
  const [jobRole, setJobRole] = useState('Full-Stack Developer');
  const [techStack, setTechStack] = useState('React, Next.js, Node.js, MongoDB');
  const [difficultyLevel, setDifficultyLevel] = useState('medium');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  // Live Session
  const [interviewId, setInterviewId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);
  const [questionStartSec, setQuestionStartSec] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [codeMode, setCodeMode] = useState(false);

  // Voice
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Result
  const [resultData, setResultData] = useState(null);

  const loadInitialData = useCallback(async () => {
    setLoadingInit(true);
    try {
      const [limitRes, histRes] = await Promise.allSettled([
        getInterviewLimit(),
        getInterviewHistory(),
      ]);

      if (limitRes.status === 'fulfilled') {
        setLimitInfo(limitRes.value?.data || null);
      }
      if (histRes.status === 'fulfilled') {
        setHistory(Array.isArray(histRes.value?.data) ? histRes.value.data : []);
      }
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (phase !== 'session') return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const speakText = useCallback(
    (text) => {
      if (
        !voiceEnabled ||
        typeof window === 'undefined' ||
        !window.speechSynthesis ||
        !text
      ) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.98;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [voiceEnabled]
  );

  useEffect(() => {
    if (phase === 'session' && questions[currentIdx]?.questionText) {
      const q = questions[currentIdx];
      setCodeMode(Boolean(q.isCodeQuestion));
      if (voiceEnabled && !q.isCodeQuestion) {
        speakText(q.questionText);
      }
    }
  }, [phase, currentIdx, questions, voiceEnabled, speakText]);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
      return;
    }
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      toast.error('Voice typing works best in Chrome/Edge. Type your answer below.');
      return;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          transcript += `${event.results[i][0].transcript} `;
        }
      }
      if (transcript.trim()) {
        setCurrentAnswer((prev) =>
          `${prev}${prev ? ' ' : ''}${transcript.trim()}`
        );
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!jobRole.trim()) {
      toast.error('Please enter a job role.');
      return;
    }

    const formData = new FormData();
    formData.append('jobRole', jobRole.trim());
    formData.append('techStack', techStack.trim());
    formData.append('difficultyLevel', difficultyLevel);
    if (jobDescription.trim()) {
      formData.append('jobDescription', jobDescription.trim());
    }
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }

    setStarting(true);
    try {
      const { data } = await startInterview(formData);
      const iv = data?.interview;
      if (!iv?._id || !Array.isArray(iv.questions) || !iv.questions.length) {
        toast.error('Could not generate questions. Please try again.');
        return;
      }

      setInterviewId(iv._id);
      setQuestions(iv.questions);
      setCurrentIdx(0);
      setCurrentAnswer('');
      setLastFeedback(null);
      setElapsedSeconds(0);
      setQuestionStartSec(0);
      setResultData(null);
      setPhase('session');
      toast.success('12 AI questions ready — all the best!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not start interview.';
      toast.error(msg);
      if (err.response?.status === 429 || err.response?.data?.limitReached) {
        setUpgradeOpen(true);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitCurrentAnswer = async (skip = false) => {
    if (!interviewId) return;
    stopListening();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const answerText = skip
      ? '(Skipped)'
      : currentAnswer.trim() || '(Skipped)';
    const timeSpent = Math.max(0, elapsedSeconds - questionStartSec);

    setSubmittingAns(true);
    try {
      const { data } = await submitAnswer(interviewId, {
        questionIndex: currentIdx,
        userAnswer: answerText,
        timeSpent,
      });

      setLastFeedback({
        questionIndex: currentIdx,
        score: data?.score ?? 0,
        aiFeedback: data?.aiFeedback || 'Answer recorded.',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save answer.');
    } finally {
      setSubmittingAns(false);
    }
  };

  const handleNextOrComplete = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setCurrentAnswer('');
      setLastFeedback(null);
      setQuestionStartSec(elapsedSeconds);
    } else {
      await handleFinishInterview();
    }
  };

  const handleFinishInterview = async () => {
    if (!interviewId) return;
    stopListening();
    setCompleting(true);
    try {
      const { data } = await completeInterview(interviewId);
      setResultData(data?.interview || data);
      setPhase('result');
      toast.success('Interview evaluation complete!');
      await loadInitialData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not complete interview.'
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleAbandon = async () => {
    if (!window.confirm('End and abandon this interview session?')) return;
    stopListening();
    if (interviewId) {
      try {
        await abandonInterview(interviewId);
      } catch {
        // ignore
      }
    }
    setPhase('setup');
    await loadInitialData();
  };

  const handleOpenHistoryItem = async (id) => {
    try {
      const { data } = await getInterviewDetail(id);
      setResultData(data);
      setPhase('result');
    } catch {
      toast.error('Could not load scorecard details.');
    }
  };

  const activeQ = questions[currentIdx];
  const overallScore = Number(resultData?.totalScore ?? 0);
  const scoreTone =
    overallScore >= 75
      ? 'text-tealbrand-700 bg-tealbrand-50 border-tealbrand-200'
      : overallScore >= 50
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-coral-700 bg-coral-50 border-coral-200';

  return (
    <AppShell
      title="AI Voice Mock Interview"
      subtitle="12 tailored Qs including live code prediction & debugging with strict AI evaluation"
      allowedRoles={['job_seeker_fresher', 'job_seeker_experienced']}
    >
      {loadingInit ? (
        <Spinner label="Preparing interview studio..." />
      ) : (
        <div className="space-y-6 animate-fade-up">
          {/* PHASE 1: SETUP */}
          {phase === 'setup' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <Card className="lg:col-span-7 p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral-50 border border-coral-200 text-coral-700 text-[11px] font-bold">
                        <Sparkles className="w-3 h-3" />
                        12-QUESTION STUDIO
                      </span>
                      {limitInfo && (
                        <Badge
                          tone={limitInfo.canInterview ? 'teal' : 'rose'}
                        >
                          Today: {limitInfo.todayCount}/{limitInfo.limit} used
                        </Badge>
                      )}
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-ink">
                      Configure Your Mock Interview
                    </h2>
                  </div>

                  {!isPremium && (
                    <button
                      type="button"
                      onClick={() => setUpgradeOpen(true)}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      10/Day PRO
                    </button>
                  )}
                </div>

                <form onSubmit={handleStart} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Target Job Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink focus:outline-none focus:border-coral-600"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ROLE_PRESETS.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setJobRole(role)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            jobRole === role
                              ? 'bg-ink text-white border-ink'
                              : 'bg-canvas text-muted border-stone-200 hover:text-ink'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                        Tech Stack / Skills
                      </label>
                      <input
                        type="text"
                        value={techStack}
                        onChange={(e) => setTechStack(e.target.value)}
                        placeholder="React, Node.js, SQL, Java..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                        Difficulty
                      </label>
                      <select
                        value={difficultyLevel}
                        onChange={(e) => setDifficultyLevel(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                      >
                        <option value="easy">Easy (Warm-up)</option>
                        <option value="medium">Medium (Real Interview)</option>
                        <option value="hard">Hard (Bar Raiser)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Optional: Attach Resume PDF (for project-specific Qs)
                    </label>
                    <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-canvas border border-dashed border-stone-300 cursor-pointer hover:border-coral-500">
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-ink truncate">
                        <Upload className="w-4 h-4 text-coral-600 shrink-0" />
                        {resumeFile
                          ? resumeFile.name
                          : 'Click to upload PDF / DOCX resume (optional)'}
                      </span>
                      {resumeFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setResumeFile(null);
                          }}
                          className="text-muted hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        className="hidden"
                        onChange={(e) =>
                          setResumeFile(e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      Job Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste key requirements from a JD..."
                      className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-stone-200 text-sm text-ink"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={starting}
                    className="w-full"
                  >
                    <Play className="w-4 h-4" />
                    {starting
                      ? 'Generating 12 AI Questions...'
                      : 'Start Mock Interview'}
                  </Button>
                </form>
              </Card>

              {/* History */}
              <Card className="lg:col-span-5 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-lg text-ink flex items-center gap-2">
                    <History className="w-4 h-4 text-coral-600" />
                    Past Scorecards
                  </h3>
                  <Badge tone="neutral">{history.length}</Badge>
                </div>

                {history.length === 0 ? (
                  <div className="rounded-2xl bg-canvas border border-dashed border-stone-300 p-6 text-center">
                    <Mic className="w-6 h-6 text-muted mx-auto mb-2" />
                    <p className="text-sm font-semibold text-ink">
                      No mock interviews yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                    {history.map((item) => {
                      const sc = Number(item.totalScore ?? 0);
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleOpenHistoryItem(item._id)}
                          className="w-full text-left p-4 rounded-2xl bg-canvas border border-stone-200 hover:border-coral-500 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink truncate">
                              {item.jobRole}
                            </p>
                            <p className="text-[11px] text-muted mt-0.5">
                              {item.difficultyLevel} • {item.status} •{' '}
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                              sc >= 75
                                ? 'bg-tealbrand-50 text-tealbrand-700 border-tealbrand-200'
                                : sc >= 50
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-coral-50 text-coral-700 border-coral-200'
                            }`}
                          >
                            {sc}/100
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* PHASE 2: LIVE SESSION */}
          {phase === 'session' && activeQ && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="rounded-3xl bg-[#141418] text-white p-5 sm:p-6 border border-white/10 shadow-lifted space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-coral-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest text-coral-200">
                        Live AI Interview • {jobRole}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Question {currentIdx + 1} of {questions.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-mono font-semibold">
                      <Clock className="w-3.5 h-3.5 text-tealbrand-600" />
                      {formatTimer(elapsedSeconds)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !voiceEnabled;
                        setVoiceEnabled(next);
                        if (!next && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                          setIsSpeaking(false);
                        }
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/15"
                    >
                      {voiceEnabled ? (
                        <Volume2 className="w-4 h-4 text-tealbrand-600" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-stone-400" />
                      )}
                    </button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={completing}
                      onClick={handleFinishInterview}
                    >
                      Finish Early
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleAbandon}
                    >
                      Quit
                    </Button>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-coral-500 to-tealbrand-600 transition-all duration-300"
                    style={{
                      width: `${((currentIdx + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <Card className="p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="coral">Q{currentIdx + 1}</Badge>
                    {activeQ.isCodeQuestion && (
                      <Badge tone="dark">
                        <Code2 className="w-3 h-3" />
                        Code Round
                      </Badge>
                    )}
                    {isSpeaking && (
                      <span className="text-xs font-semibold text-tealbrand-700">
                        Speaking...
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(activeQ.questionText)}
                    className="text-xs font-semibold text-muted hover:text-ink inline-flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Read Aloud
                  </button>
                </div>

                <div
                  className={
                    activeQ.isCodeQuestion
                      ? 'p-4 rounded-2xl bg-[#141418] text-stone-100 font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed'
                      : 'font-display text-xl sm:text-2xl font-semibold text-ink leading-snug whitespace-pre-line'
                  }
                >
                  {activeQ.questionText}
                </div>

                {/* Live Instant AI Feedback Box after submitting this question */}
                {lastFeedback ? (
                  <div className="rounded-2xl bg-tealbrand-50/70 border border-tealbrand-200 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-tealbrand-800">
                        Instant AI Evaluation
                      </span>
                      <Badge
                        tone={
                          lastFeedback.score >= 7
                            ? 'teal'
                            : lastFeedback.score >= 4
                            ? 'amber'
                            : 'rose'
                        }
                      >
                        Score: {lastFeedback.score} / 10
                      </Badge>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">
                      {lastFeedback.aiFeedback}
                    </p>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="primary"
                        loading={completing}
                        onClick={handleNextOrComplete}
                      >
                        {currentIdx < questions.length - 1 ? (
                          <>
                            Next Question
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            View Final Scorecard
                            <Trophy className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase text-muted">
                        Your Answer
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCodeMode((p) => !p)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                            codeMode
                              ? 'bg-ink text-white border-ink'
                              : 'bg-canvas text-muted border-stone-200'
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          Code Font
                        </button>
                        <button
                          type="button"
                          onClick={toggleVoiceInput}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
                            isListening
                              ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                              : 'bg-coral-50 text-coral-700 border-coral-200'
                          }`}
                        >
                          {isListening ? (
                            <>
                              <MicOff className="w-3.5 h-3.5" />
                              Stop Mic
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" />
                              Speak Answer
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={codeMode ? 8 : 6}
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Speak with your mic or type a detailed technical answer..."
                      className={`w-full p-4 rounded-2xl border focus:outline-none focus:border-coral-600 text-sm leading-relaxed ${
                        codeMode
                          ? 'bg-[#18181B] text-stone-100 border-stone-700 font-mono'
                          : 'bg-canvas text-ink border-stone-200'
                      }`}
                    />

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={submittingAns}
                        onClick={() => handleSubmitCurrentAnswer(true)}
                      >
                        <SkipForward className="w-4 h-4" />
                        Skip
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        loading={submittingAns}
                        onClick={() => handleSubmitCurrentAnswer(false)}
                      >
                        <Send className="w-4 h-4" />
                        {submittingAns ? 'AI Grading...' : 'Submit Answer'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* PHASE 3: FINAL SCORECARD */}
          {phase === 'result' && resultData && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="rounded-3xl bg-[#141418] text-white p-6 sm:p-8 border border-white/10 shadow-lifted flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-coral-200">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    FINAL EVALUATION REPORT
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold">
                    {resultData.jobRole}
                  </h2>
                  <p className="text-sm text-stone-300 max-w-xl leading-relaxed">
                    {resultData.overallFeedback ||
                      'Review your question-by-question breakdown below.'}
                  </p>
                </div>

                <div
                  className={`shrink-0 rounded-2xl border px-6 py-4 text-center ${scoreTone}`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider">
                    Total Score
                  </p>
                  <p className="font-mono text-4xl font-bold mt-1">
                    {overallScore}
                    <span className="text-sm font-normal opacity-70">/100</span>
                  </p>
                </div>
              </div>

              {(resultData.strengths?.length > 0 ||
                resultData.improvements?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {resultData.strengths?.length > 0 && (
                    <Card className="p-6 space-y-3">
                      <h3 className="font-display font-semibold text-base text-tealbrand-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Strengths
                      </h3>
                      <ul className="space-y-2 text-sm text-ink">
                        {resultData.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-tealbrand-600 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {resultData.improvements?.length > 0 && (
                    <Card className="p-6 space-y-3">
                      <h3 className="font-display font-semibold text-base text-coral-700 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Areas to Improve
                      </h3>
                      <ul className="space-y-2 text-sm text-ink">
                        {resultData.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-coral-600 font-bold">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              )}

              {Array.isArray(resultData.questions) &&
                resultData.questions.length > 0 && (
                  <Card className="p-6 space-y-4">
                    <h3 className="font-display font-semibold text-lg text-ink flex items-center gap-2">
                      <Award className="w-5 h-5 text-coral-600" />
                      Question-by-Question Review
                    </h3>
                    <div className="space-y-4">
                      {resultData.questions.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-canvas border border-stone-200 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-bold text-ink whitespace-pre-line">
                              Q{idx + 1}. {item.questionText}
                            </p>
                            <Badge
                              tone={
                                (item.score ?? 0) >= 7
                                  ? 'teal'
                                  : (item.score ?? 0) >= 4
                                  ? 'amber'
                                  : 'rose'
                              }
                            >
                              {item.score ?? 0}/10
                            </Badge>
                          </div>
                          {item.userAnswer && (
                            <p className="text-xs text-muted bg-white border border-stone-200/80 rounded-xl p-3">
                              <strong className="text-ink">Your answer:</strong>{' '}
                              {item.userAnswer}
                            </p>
                          )}
                          {item.aiFeedback && (
                            <p className="text-xs text-ink/90 leading-relaxed">
                              <strong className="text-coral-700">
                                AI Feedback:
                              </strong>{' '}
                              {item.aiFeedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPhase('setup')}
                >
                  <RotateCcw className="w-4 h-4" />
                  Start New Interview
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onUpgraded={async () => {
          await refreshUser();
          await loadInitialData();
        }}
      />
    </AppShell>
  );
}
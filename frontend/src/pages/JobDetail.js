import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobById, applyJob, saveJob, getJobMatch } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const JobDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matchInfo, setMatchInfo] = useState(null);

  const isJobSeeker = user?.role === 'job_seeker_fresher' || user?.role === 'job_seeker_experienced';

  useEffect(() => { fetchJob(); }, [id]);

  const fetchJob = async () => {
    try {
      const { data } = await getJobById(id);
      setJob(data);
      if (isJobSeeker) {
        try {
          const matchRes = await getJobMatch(id);
          setMatchInfo(matchRes.data);
        } catch(e) {}
      }
    } catch (err) {
      toast.error('Job not found');
      navigate('/jobs');
    }
    setLoading(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyJob(id);
      toast.success('Applied successfully!');
      fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    }
    setApplying(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await saveJob(id);
      toast.success(data.saved ? 'Job saved!' : 'Job unsaved');
      fetchJob();
    } catch (err) {
      toast.error('Failed to save job');
    }
    setSaving(false);
  };

  const hasApplied = job?.applicants?.some(a => a.user?._id === user?.id || a.user === user?.id);
  const hasSaved = job?.savedBy?.includes(user?.id);

  const getMatchColor = (percent) => {
    if (percent >= 75) return 'text-green-600 bg-green-50 border-green-200';
    if (percent >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getBarColor = (percent) => {
    if (percent >= 75) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-400';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
  );

  if (!job) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-indigo-600 hover:text-indigo-800 font-medium">
            Back
          </button>
          <span className="font-bold text-xl text-indigo-700">CareerGuide AI</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
              <p className="text-lg text-indigo-600 font-medium mt-1">{job.company}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-sm text-gray-600">📍 {job.location}</span>
                <span className="text-sm text-gray-600">💰 {job.salary || 'Not Disclosed'}</span>
                <span className="text-sm text-gray-600">🕐 {job.jobType}</span>
                <span className="text-sm text-gray-600">📊 {job.experienceLevel}</span>
              </div>
            </div>

            {isJobSeeker && (
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className={"px-4 py-2 rounded-lg border font-medium text-sm transition " + (hasSaved ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-gray-300 text-gray-600 hover:border-indigo-400')}>
                  {saving ? '...' : hasSaved ? 'Saved' : 'Save'}
                </button>
                <button onClick={handleApply} disabled={applying || hasApplied}
                  className={"px-6 py-2 rounded-lg font-medium text-sm transition " + (hasApplied ? 'bg-green-100 text-green-700 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700')}>
                  {applying ? 'Applying...' : hasApplied ? 'Applied' : 'Apply Now'}
                </button>
              </div>
            )}
          </div>

          {/* Match % Section */}
          {isJobSeeker && matchInfo && matchInfo.hasResume && (
            <div className={"mt-4 p-4 rounded-xl border " + getMatchColor(matchInfo.matchPercent)}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm">Your Profile Match</span>
                <span className="text-2xl font-bold">{matchInfo.matchPercent}%</span>
              </div>
              <div className="w-full bg-white rounded-full h-2 mb-3">
                <div
                  className={"h-2 rounded-full " + getBarColor(matchInfo.matchPercent)}
                  style={{ width: matchInfo.matchPercent + '%' }}>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {matchInfo.matchedSkills?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Matched Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {matchInfo.matchedSkills.map((s, i) => (
                        <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {matchInfo.missingSkills?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Missing Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {matchInfo.missingSkills.map((s, i) => (
                        <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isJobSeeker && matchInfo && !matchInfo.hasResume && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <p className="text-sm text-gray-500">Upload your resume to see match %</p>
              <button onClick={() => navigate('/resume')}
                className="mt-2 text-xs text-indigo-600 font-medium hover:underline">
                Upload Resume
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full">{job.category}</span>
            <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">{job.jobType}</span>
            <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">{job.experienceLevel}</span>
            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              👥 {job.applicants?.length || 0} applicants
            </span>
            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              📅 Posted {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Job Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>

            {job.requiredSkills?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill, i) => (
                    <span key={i} className={"px-3 py-1 rounded-full text-sm font-medium border " + (
                      matchInfo?.matchedSkills?.includes(skill)
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : matchInfo?.missingSkills?.includes(skill)
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    )}>
                      {skill}
                      {matchInfo?.matchedSkills?.includes(skill) && ' ✓'}
                      {matchInfo?.missingSkills?.includes(skill) && ' ✗'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.updates?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Recruiter Updates</h2>
                <div className="space-y-3">
                  {job.updates.map((update, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div>
                        <p className="text-gray-700 text-sm">{update.message}</p>
                        <p className="text-gray-400 text-xs mt-1">{new Date(update.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">About Recruiter</h2>
              <div className="space-y-2">
                <p className="font-medium text-gray-800">{job.postedBy?.name}</p>
                <p className="text-sm text-gray-500">{job.postedBy?.designation}</p>
                <p className="text-sm text-indigo-600 font-medium">{job.postedBy?.companyName}</p>
                {job.postedBy?.companyWebsite && (
                  <a href={job.postedBy.companyWebsite} target="_blank" rel="noreferrer"
                    className="text-sm text-blue-500 hover:underline block">
                    {job.postedBy.companyWebsite}
                  </a>
                )}
              </div>
            </div>

            {isJobSeeker && !hasApplied && (
              <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center">
                <p className="font-bold text-lg mb-2">Ready to Apply?</p>
                <p className="text-indigo-200 text-sm mb-4">Join {job.applicants?.length || 0} other applicants</p>
                <button onClick={handleApply} disabled={applying}
                  className="w-full bg-white text-indigo-600 font-bold py-2 rounded-lg hover:bg-indigo-50 transition">
                  {applying ? 'Applying...' : 'Apply Now'}
                </button>
              </div>
            )}

            {hasApplied && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-green-600 font-bold text-lg">Already Applied!</p>
                <p className="text-green-500 text-sm mt-1">Track your application status</p>
                <button onClick={() => navigate('/applied-jobs')}
                  className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                  View Application
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
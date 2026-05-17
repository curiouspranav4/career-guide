import React, { useState, useEffect } from 'react';
import { getAllJobs, applyJob, saveJob, getJobMatch } from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [expLevel, setExpLevel] = useState('All');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [matchData, setMatchData] = useState({});
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isJobSeeker = user?.role === 'job_seeker_fresher' || user?.role === 'job_seeker_experienced';

  useEffect(() => { fetchJobs(); }, []);

  useEffect(() => {
    let result = jobs;
    if (search) result = result.filter(j =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.requiredSkills?.some(s => s.toLowerCase().includes(search.toLowerCase()))
    );
    if (category !== 'All') result = result.filter(j => j.category === category);
    if (expLevel !== 'All') result = result.filter(j => j.experienceLevel === expLevel);
    setFiltered(result);
  }, [search, category, expLevel, jobs]);

  const fetchJobs = async () => {
    try {
      const { data } = await getAllJobs();
      setJobs(data);
      setFiltered(data);
      // Fetch match % for all jobs if job seeker
      if (isJobSeeker) {
        const matchMap = {};
        await Promise.all(data.map(async (job) => {
          try {
            const res = await getJobMatch(job._id);
            matchMap[job._id] = res.data;
          } catch(e) {}
        }));
        setMatchData(matchMap);
      }
    } catch {
      toast.error('Failed to load jobs');
    }
    setLoading(false);
  };

  const handleApply = async (e, jobId) => {
    e.stopPropagation();
    setActionLoading(prev => ({ ...prev, [`apply_${jobId}`]: true }));
    try {
      await applyJob(jobId);
      toast.success('Applied successfully!');
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    }
    setActionLoading(prev => ({ ...prev, [`apply_${jobId}`]: false }));
  };

  const handleSave = async (e, jobId) => {
    e.stopPropagation();
    setActionLoading(prev => ({ ...prev, [`save_${jobId}`]: true }));
    try {
      const { data } = await saveJob(jobId);
      toast.success(data.saved ? 'Job saved!' : 'Job unsaved');
      fetchJobs();
    } catch (err) {
      toast.error('Failed to save job');
    }
    setActionLoading(prev => ({ ...prev, [`save_${jobId}`]: false }));
  };

  const hasApplied = (job) => job.applicants?.some(a => a.user?._id === user?.id || a.user === user?.id);
  const hasSaved = (job) => job.savedBy?.includes(user?.id);

  const getMatchColor = (percent) => {
    if (percent >= 75) return 'bg-green-100 text-green-700';
    if (percent >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const categories = ['All', ...new Set(jobs.map(j => j.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span className="font-bold text-xl text-indigo-700">CareerGuide AI</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <button onClick={() => navigate('/dashboard')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                Dashboard
              </button>
              <button className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg">
                Jobs
              </button>
              <button onClick={() => navigate('/companies')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                Companies
              </button>
              <button onClick={() => navigate('/saved-jobs')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                Saved Jobs
              </button>
              <button onClick={() => navigate('/applied-jobs')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                Applications
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">👋 {user?.name}</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Browse Jobs</h2>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} jobs found</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search jobs, companies or skills..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
          <select
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={expLevel}
            onChange={(e) => setExpLevel(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="fresher">Fresher</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-500 text-xl">No jobs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((job) => {
              const match = matchData[job._id];
              const matchPercent = match?.matchPercent || 0;
              const hasResume = match?.hasResume;
              return (
                <div key={job._id}
                  onClick={() => navigate('/jobs/' + job._id)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5 border border-gray-100 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{job.title}</h3>
                      <p className="text-indigo-600 font-medium text-sm">{job.company}</p>
                      {job.postedBy?.name && (
                        <p className="text-gray-400 text-xs">by {job.postedBy.name}</p>
                      )}
                    </div>
                    <span className={"px-2 py-1 rounded-full text-xs font-medium ml-2 " + (
                      job.jobType === 'full-time' ? 'bg-green-100 text-green-700' :
                      job.jobType === 'internship' ? 'bg-yellow-100 text-yellow-700' :
                      job.jobType === 'remote' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700')}>
                      {job.jobType}
                    </span>
                  </div>

                  {/* Match % for job seeker */}
                  {isJobSeeker && hasResume && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Your Match</span>
                        <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + getMatchColor(matchPercent)}>
                          {matchPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={"h-1.5 rounded-full " + (matchPercent >= 75 ? 'bg-green-500' : matchPercent >= 50 ? 'bg-yellow-500' : 'bg-red-400')}
                          style={{ width: matchPercent + '%' }}>
                        </div>
                      </div>
                    </div>
                  )}

                  {isJobSeeker && !hasResume && (
                    <p className="text-xs text-gray-400 mb-2">Upload resume to see match %</p>
                  )}

                  <p className="text-gray-500 text-xs mb-1">📍 {job.location}</p>
                  <p className="text-gray-500 text-xs mb-3">📊 {job.experienceLevel} • 💰 {job.salary || 'Not Disclosed'}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {job.requiredSkills?.slice(0, 3).map((skill, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs">{skill}</span>
                    ))}
                    {job.requiredSkills?.length > 3 && (
                      <span className="text-xs text-gray-400">+{job.requiredSkills.length - 3} more</span>
                    )}
                  </div>

                  {isJobSeeker && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <button
                        onClick={(e) => handleSave(e, job._id)}
                        disabled={actionLoading['save_' + job._id]}
                        className={"flex-1 py-1.5 rounded-lg text-xs font-medium border transition " + (
                          hasSaved(job)
                            ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
                            : 'border-gray-200 text-gray-600 hover:border-indigo-300')}>
                        {hasSaved(job) ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={(e) => handleApply(e, job._id)}
                        disabled={actionLoading['apply_' + job._id] || hasApplied(job)}
                        className={"flex-1 py-1.5 rounded-lg text-xs font-medium transition " + (
                          hasApplied(job)
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700')}>
                        {hasApplied(job) ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppliedJobs } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const AppliedJobs = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAppliedJobs(); }, []);

  const fetchAppliedJobs = async () => {
    try {
      const { data } = await getAppliedJobs();
      setJobs(data);
    } catch (err) {
      toast.error('Failed to load applied jobs');
    }
    setLoading(false);
  };

  const statusColors = {
    applied: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-yellow-100 text-yellow-700',
    interview: 'bg-purple-100 text-purple-700',
    selected: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  const statusIcons = {
    applied: '📨',
    shortlisted: '⭐',
    interview: '🎯',
    selected: '✅',
    rejected: '❌'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-indigo-600 font-medium">← Back</button>
            <span className="font-bold text-xl text-indigo-700">🎯 CareerGuide AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">👋 {user?.name}</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📨 Applied Jobs</h1>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-4xl mb-4">📨</p>
            <p className="text-gray-500 text-lg">No applications yet</p>
            <button onClick={() => navigate('/jobs')}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job._id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[job.applicationStatus]}`}>
                        {statusIcons[job.applicationStatus]} {job.applicationStatus?.charAt(0).toUpperCase() + job.applicationStatus?.slice(1)}
                      </span>
                    </div>
                    <p className="text-indigo-600 font-medium">{job.company}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-sm text-gray-500">📍 {job.location}</span>
                      <span className="text-sm text-gray-500">💰 {job.salary || 'Not Disclosed'}</span>
                      <span className="text-sm text-gray-500">📅 Applied: {new Date(job.appliedAt).toLocaleDateString()}</span>
                    </div>

                    {/* Application Status Timeline */}
                    <div className="mt-3 flex items-center gap-1">
                      {['applied', 'shortlisted', 'interview', 'selected'].map((s, i) => {
                        const statuses = ['applied', 'shortlisted', 'interview', 'selected'];
                        const currentIndex = statuses.indexOf(job.applicationStatus);
                        const stepIndex = statuses.indexOf(s);
                        const isRejected = job.applicationStatus === 'rejected';
                        return (
                          <React.Fragment key={s}>
                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                              ${isRejected ? 'bg-red-100 text-red-500' :
                                stepIndex <= currentIndex ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {stepIndex <= currentIndex && !isRejected ? '✓' : i + 1}
                            </div>
                            {i < 3 && <div className={`flex-1 h-1 rounded ${stepIndex < currentIndex && !isRejected ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-1">
                      {['Applied', 'Shortlisted', 'Interview', 'Selected'].map(s => (
                        <span key={s} className="text-xs text-gray-400 flex-1 text-center">{s}</span>
                      ))}
                    </div>

                    {/* Recruiter Updates */}
                    {job.recruiterUpdates?.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <p className="text-xs font-medium text-yellow-700 mb-2">📢 Recruiter Updates</p>
                        {job.recruiterUpdates.slice(-2).map((u, i) => (
                          <p key={i} className="text-xs text-gray-600">
                            📌 {u.message} <span className="text-gray-400">• {new Date(u.createdAt).toLocaleDateString()}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => navigate(`/jobs/${job._id}`)}
                    className="text-sm bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100">
                    View Job
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppliedJobs;
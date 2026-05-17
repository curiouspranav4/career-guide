import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedJobs, saveJob } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const SavedJobs = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSavedJobs(); }, []);

  const fetchSavedJobs = async () => {
    try {
      const { data } = await getSavedJobs();
      setJobs(data);
    } catch (err) {
      toast.error('Failed to load saved jobs');
    }
    setLoading(false);
  };

  const handleUnsave = async (id) => {
    try {
      await saveJob(id);
      toast.success('Job unsaved');
      fetchSavedJobs();
    } catch (err) {
      toast.error('Failed to unsave');
    }
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🔖 Saved Jobs</h1>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-4xl mb-4">🔖</p>
            <p className="text-gray-500 text-lg">No saved jobs yet</p>
            <button onClick={() => navigate('/jobs')}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job._id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/jobs/${job._id}`)}>
                    <h3 className="font-bold text-lg text-gray-800 hover:text-indigo-600">{job.title}</h3>
                    <p className="text-indigo-600 font-medium">{job.company}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-gray-500">📍 {job.location}</span>
                      <span className="text-sm text-gray-500">💰 {job.salary || 'Not Disclosed'}</span>
                      <span className="text-sm text-gray-500">🕐 {job.jobType}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.requiredSkills?.slice(0, 4).map((skill, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">{skill}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button onClick={() => navigate(`/jobs/${job._id}`)}
                      className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                      View & Apply
                    </button>
                    <button onClick={() => handleUnsave(job._id)}
                      className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobs;
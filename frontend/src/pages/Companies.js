import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllJobs } from '../api';
import { useAuth } from '../context/AuthContext';

const Companies = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const { data } = await getAllJobs();
      // Extract unique companies from jobs
      const companyMap = {};
      data.forEach(job => {
        if (!companyMap[job.company]) {
          companyMap[job.company] = {
            name: job.company,
            jobs: [],
            categories: new Set(),
            locations: new Set(),
            recruiter: job.postedBy
          };
        }
        companyMap[job.company].jobs.push(job);
        companyMap[job.company].categories.add(job.category);
        companyMap[job.company].locations.add(job.location);
      });
      setCompanies(Object.values(companyMap));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const categories = ['All', 'IT', 'Finance', 'Marketing', 'Data Science', 'Design', 'Other'];

  const filtered = activeCategory === 'All' ? companies :
    companies.filter(c => [...c.categories].some(cat =>
      cat.toLowerCase().includes(activeCategory.toLowerCase())
    ));

  const companyColors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-yellow-500 to-orange-600',
    'from-teal-500 to-cyan-600',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span className="font-bold text-xl text-indigo-700">CareerGuide AI</span>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-indigo-600 text-sm font-medium">Dashboard</button>
              <button onClick={() => navigate('/jobs')} className="text-gray-600 hover:text-indigo-600 text-sm font-medium">Jobs</button>
              <button className="text-indigo-600 font-medium text-sm border-b-2 border-indigo-600">Companies</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">👋 {user?.name}</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🏢 Companies Hiring Now</h1>
          <p className="text-gray-500 mt-1">Explore companies and their open positions</p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map(cat => (
            <button key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-4xl mb-4">🏢</p>
            <p className="text-gray-500">No companies found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((company, index) => (
              <div key={company.name} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden">
                {/* Company Header */}
                <div className={`bg-gradient-to-r ${companyColors[index % companyColors.length]} p-6`}>
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-indigo-600">
                      {company.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{company.name}</h3>
                  {company.recruiter?.designation && (
                    <p className="text-white text-opacity-80 text-sm mt-1">
                      Posted by: {company.recruiter.name} • {company.recruiter.designation}
                    </p>
                  )}
                </div>

                {/* Company Info */}
                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[...company.categories].map((cat, i) => (
                      <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">{cat}</span>
                    ))}
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      📍 {[...company.locations].join(', ')}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      💼 {company.jobs.length} open position{company.jobs.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Open Positions */}
                  <div className="space-y-2">
                    {company.jobs.slice(0, 3).map(job => (
                      <div key={job._id}
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-indigo-50 transition">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{job.title}</p>
                          <p className="text-xs text-gray-500">{job.jobType} • {job.experienceLevel}</p>
                        </div>
                        <span className="text-xs text-indigo-600 font-medium">View →</span>
                      </div>
                    ))}
                    {company.jobs.length > 3 && (
                      <p className="text-xs text-center text-gray-400 mt-1">+{company.jobs.length - 3} more positions</p>
                    )}
                  </div>

                  <button
                    onClick={() => navigate('/jobs')}
                    className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                    View All Jobs →
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

export default Companies;
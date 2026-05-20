import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRecruiterJobs, addJob, deleteJob, updateApplicantStatus, postJobUpdate, getApplicantResume, getProfile } from '../api';
import { toast } from 'react-toastify';

const RecruiterDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [resumeData, setResumeData] = useState({});
  const [recruiterProfile, setRecruiterProfile] = useState(null);

  // ── CHANGE 1: salaryLPA field added in jobForm state ─────────────────────────
  const [jobForm, setJobForm] = useState({
    title: '', company: user?.companyName || '', location: '',
    description: '', requiredSkills: '', experienceLevel: 'fresher',
    salary: '', salaryLPA: 0, jobType: 'full-time', category: ''
  });

  useEffect(() => { fetchJobs(); fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await getProfile();
      setRecruiterProfile(data);
    } catch(e) {}
  };

  const fetchJobs = async () => {
    try {
      const { data } = await getRecruiterJobs();
      setJobs(data);
    } catch (err) {
      toast.error('Failed to load jobs');
    }
    setLoading(false);
  };

  const handleManageJob = async (job) => {
    if (selectedJob?._id === job._id) {
      setSelectedJob(null);
      return;
    }
    setSelectedJob(job);
    const resumeMap = {};
    for (const applicant of job.applicants) {
      try {
        const { data } = await getApplicantResume(applicant.user?._id, job._id);
        resumeMap[applicant.user?._id] = data;
      } catch(e) {}
    }
    setResumeData(resumeMap);
  };

  // ── CHANGE 2: salaryLPA included in submit + form reset ───────────────────────
  const handleAddJob = async (e) => {
    e.preventDefault();
    try {
      const jobData = {
        ...jobForm,
        requiredSkills: jobForm.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        salaryLPA: Number(jobForm.salaryLPA) || 0,
      };
      await addJob(jobData);
      toast.success('Job posted successfully!');
      setShowAddJob(false);
      setJobForm({
        title: '', company: user?.companyName || '', location: '',
        description: '', requiredSkills: '', experienceLevel: 'fresher',
        salary: '', salaryLPA: 0, jobType: 'full-time', category: ''
      });
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post job');
    }
  };

  const handleStatusUpdate = async (jobId, userId, status) => {
    try {
      await updateApplicantStatus(jobId, userId, status);
      toast.success('Status updated!');
      const { data } = await getRecruiterJobs();
      setJobs(data);
      const updatedJob = data.find(j => j._id === jobId);
      if (updatedJob) setSelectedJob(updatedJob);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handlePostUpdate = async (jobId) => {
    if (!updateMsg.trim()) return;
    try {
      await postJobUpdate(jobId, updateMsg);
      toast.success('Update posted!');
      setUpdateMsg('');
      fetchJobs();
    } catch (err) {
      toast.error('Failed to post update');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      await deleteJob(id);
      toast.success('Job deleted');
      fetchJobs();
      setSelectedJob(null);
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  const getMatchColor = (percent) => {
    if (percent >= 75) return 'bg-green-100 text-green-700';
    if (percent >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const statusColors = {
    applied: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-yellow-100 text-yellow-700',
    interview: 'bg-purple-100 text-purple-700',
    selected: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  const recruiterStatus = recruiterProfile?.recruiterStatus || 'pending';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-xl text-indigo-700">CareerGuide AI</span>
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Recruiter</span>
            <span className={"ml-1 text-xs px-2 py-1 rounded-full font-medium " + (recruiterStatus === 'approved' ? 'bg-green-100 text-green-700' : recruiterStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}>
              {recruiterStatus === 'approved' ? 'Verified' : recruiterStatus === 'rejected' ? 'Rejected' : 'Pending Approval'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">👋 {user?.name}</span>
            <span className="text-xs text-gray-500">{user?.companyName}</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Status Banner */}
      {recruiterStatus === 'pending' && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="text-orange-500 text-xl">⏳</span>
            <div>
              <p className="text-orange-700 font-medium text-sm">Account Pending Approval</p>
              <p className="text-orange-600 text-xs">Admin is reviewing your recruiter account. You cannot post jobs until approved.</p>
            </div>
          </div>
        </div>
      )}

      {recruiterStatus === 'rejected' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="text-red-500 text-xl">❌</span>
            <div>
              <p className="text-red-700 font-medium text-sm">Account Rejected</p>
              <p className="text-red-600 text-xs">
                Your recruiter account has been rejected.
                {recruiterProfile?.recruiterRejectionReason && (
                  <span> Reason: {recruiterProfile.recruiterRejectionReason}</span>
                )}
                {' '}Please contact support.
              </p>
            </div>
          </div>
        </div>
      )}

      {recruiterStatus === 'approved' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <p className="text-green-700 text-xs font-medium">Verified Recruiter Account — You can post jobs!</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-indigo-600">{jobs.length}</p>
            <p className="text-gray-500 text-sm">Jobs Posted</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-green-600">
              {jobs.reduce((acc, j) => acc + j.applicants.length, 0)}
            </p>
            <p className="text-gray-500 text-sm">Total Applicants</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-purple-600">
              {jobs.reduce((acc, j) => acc + j.applicants.filter(a => a.status === 'selected').length, 0)}
            </p>
            <p className="text-gray-500 text-sm">Selected</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">My Job Posts</h2>
          <button
            onClick={() => recruiterStatus === 'approved' ? setShowAddJob(true) : toast.error('Your account is not approved yet!')}
            className={"px-4 py-2 rounded-lg text-sm font-medium " + (recruiterStatus === 'approved' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}>
            + Post New Job
          </button>
        </div>

        {showAddJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Post New Job</h3>
              <form onSubmit={handleAddJob} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Job Title" value={jobForm.title}
                    onChange={e => setJobForm({...jobForm, title: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input required placeholder="Company Name" value={jobForm.company}
                    onChange={e => setJobForm({...jobForm, company: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input required placeholder="Location (e.g. Noida, Delhi, Remote)" value={jobForm.location}
                    onChange={e => setJobForm({...jobForm, location: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {/* <input placeholder="Salary Range (e.g. 8-12 LPA)" value={jobForm.salary}
                    onChange={e => setJobForm({...jobForm, salary: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /> */}

                  {/* ── CHANGE 3: salaryLPA input field added ── */}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      Salary in LPA (number) — used for Auto-Apply filter
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10 for 10 LPA  |  0 = Not Disclosed"
                      min="0"
                      max="200"
                      step="0.5"
                      value={jobForm.salaryLPA}
                      onChange={e => setJobForm({...jobForm, salaryLPA: Number(e.target.value) || 0})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">
                      Premium users ka auto-apply is value se compare karta hai unki minimum expected salary se
                    </p>
                  </div>
                  {/* ─────────────────────────────────────────── */}

                  <input required placeholder="Category (e.g. IT, Finance)" value={jobForm.category}
                    onChange={e => setJobForm({...jobForm, category: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <select value={jobForm.jobType} onChange={e => setJobForm({...jobForm, jobType: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="internship">Internship</option>
                    <option value="remote">Remote</option>
                  </select>
                  <select value={jobForm.experienceLevel} onChange={e => setJobForm({...jobForm, experienceLevel: e.target.value})}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="fresher">Fresher</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
                <input placeholder="Required Skills (comma separated: react, node, mongodb)"
                  value={jobForm.requiredSkills}
                  onChange={e => setJobForm({...jobForm, requiredSkills: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea required placeholder="Job Description" rows={4} value={jobForm.description}
                  onChange={e => setJobForm({...jobForm, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAddJob(false)}
                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Post Job</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No jobs posted yet. Post your first job!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobs.map(job => (
              <div key={job._id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                    <p className="text-gray-500 text-sm">{job.company} • {job.location}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{job.jobType}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{job.experienceLevel}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">💰 {job.salary}</span>
                      {job.salaryLPA > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                          📊 {job.salaryLPA} LPA
                        </span>
                      )}
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">👥 {job.applicants.length} applicants</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleManageJob(job)}
                      className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-100">
                      {selectedJob?._id === job._id ? 'Hide' : 'Manage'}
                    </button>
                    <button onClick={() => handleDeleteJob(job._id)}
                      className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
                      Delete
                    </button>
                  </div>
                </div>

                {selectedJob?._id === job._id && (
                  <div className="mt-4 border-t pt-4">
                    <div className="mb-4">
                      <p className="font-medium text-gray-700 mb-2">Post Update to Applicants</p>
                      <div className="flex gap-2">
                        <input
                          placeholder="e.g. Interviews scheduled for next week..."
                          value={updateMsg}
                          onChange={e => setUpdateMsg(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button onClick={() => handlePostUpdate(job._id)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
                          Post
                        </button>
                      </div>
                      {job.updates && job.updates.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {job.updates.slice(-3).map((u, i) => (
                            <p key={i} className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
                              {u.message} - {new Date(u.createdAt).toLocaleDateString()}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="font-medium text-gray-700 mb-2">Applicants ({job.applicants.length})</p>
                    {job.applicants.length === 0 ? (
                      <p className="text-gray-400 text-sm">No applicants yet</p>
                    ) : (
                      <div className="space-y-3">
                        {job.applicants.map(function(applicant) {
                          var rd = resumeData[applicant.user && applicant.user._id];
                          var match = applicant.matchPercent || (rd && rd.matchPercent) || 0;
                          var resumePath = rd && rd.resume && rd.resume.filePath;
                          var skills = rd && rd.resume && rd.resume.extractedSkills;
                          return (
                            <div key={applicant._id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                              <div className="flex items-start justify-between flex-wrap gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm text-gray-800">
                                      {applicant.user ? applicant.user.name : 'Deleted User'}
                                    </p>
                                    <span className={"text-xs px-2 py-1 rounded-full font-bold " + getMatchColor(match)}>
                                      {match}% Match
                                    </span>
                                    <span className={"text-xs px-2 py-1 rounded-full font-medium " + statusColors[applicant.status]}>
                                      {applicant.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {applicant.user ? applicant.user.email : 'Account deleted'}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Applied: {new Date(applicant.appliedAt).toLocaleDateString()}
                                  </p>
                                  <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className={"h-1.5 rounded-full " + (match >= 75 ? 'bg-green-500' : match >= 50 ? 'bg-yellow-500' : 'bg-red-400')}
                                        style={{ width: match + '%' }}>
                                      </div>
                                    </div>
                                  </div>
                                  {skills && skills.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {skills.slice(0, 6).map(function(skill, i) {
                                        return (
                                          <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                            {skill}
                                          </span>
                                        );
                                      })}
                                      {skills.length > 6 && (
                                        <span className="text-xs text-gray-400">+{skills.length - 6} more</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                  <select
                                    value={applicant.status}
                                    onChange={function(e) { handleStatusUpdate(job._id, applicant.user && applicant.user._id, e.target.value); }}
                                    className="text-xs border rounded px-2 py-1 focus:outline-none">
                                    <option value="applied">Applied</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="interview">Interview</option>
                                    <option value="selected">Selected</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                  {resumePath ? (
                                    <a href={rd?.resume?.fileUrl || (process.env.REACT_APP_API_URL?.replace('/api','') + '/' + resumePath)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100">
                                      Resume
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterDashboard;
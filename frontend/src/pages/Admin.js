import React, { useState, useEffect } from 'react';
import { getAdminStats, getAllJobSeekers, getAllRecruiters, getAllJobsAdmin, deleteUser, deleteJobAdmin, getPaymentRequests, updatePaymentStatus, getPendingRecruiters, updateRecruiterStatus } from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Admin = () => {
  const [stats, setStats] = useState({});
  const [jobSeekers, setJobSeekers] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJob, setSelectedJob] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, seekersRes, recruitersRes, jobsRes, paymentsRes, pendingRes] = await Promise.all([
        getAdminStats(), getAllJobSeekers(), getAllRecruiters(), getAllJobsAdmin(), getPaymentRequests(), getPendingRecruiters()
      ]);
      setStats(statsRes.data);
      setJobSeekers(seekersRes.data);
      setRecruiters(recruitersRes.data);
      setJobs(jobsRes.data);
      setPayments(paymentsRes.data);
      setPendingRecruiters(pendingRes.data);
    } catch {
      toast.error('Failed to load data');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await deleteUser(id);
      toast.success('User deleted');
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      await deleteJobAdmin(id);
      toast.success('Job deleted');
      setSelectedJob(null);
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const handlePaymentAction = async (id, status) => {
    try {
      await updatePaymentStatus(id, status);
      toast.success('Payment ' + status + '!');
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const handleRecruiterApprove = async (id) => {
    try {
      await updateRecruiterStatus(id, 'approved', '');
      toast.success('Recruiter approved!');
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const handleRecruiterReject = async (id) => {
    try {
      await updateRecruiterStatus(id, 'rejected', rejectReason);
      toast.success('Recruiter rejected!');
      setRejectingId(null);
      setRejectReason('');
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: 'Pending Recruiters' + (pendingRecruiters.length > 0 ? ' (' + pendingRecruiters.length + ')' : '') },
    { id: 'payments', label: 'Payments' + (pendingPayments.length > 0 ? ' (' + pendingPayments.length + ')' : '') },
    { id: 'jobseekers', label: 'Job Seekers' },
    { id: 'recruiters', label: 'Recruiters' },
    { id: 'jobs', label: 'Jobs' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-xl text-indigo-700">CareerGuide AI</span>
            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Admin Panel</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedJob(null); }}
              className={"px-4 py-2 rounded-lg font-medium text-sm transition " +
                (activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200') +
                (tab.id === 'pending' && pendingRecruiters.length > 0 ? ' ring-2 ring-orange-400' : '') +
                (tab.id === 'payments' && pendingPayments.length > 0 ? ' ring-2 ring-orange-400' : '')}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-indigo-500">
                <p className="text-gray-500 text-xs">Job Seekers</p>
                <h2 className="text-3xl font-bold text-indigo-600">{stats.totalJobSeekers || 0}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
                <p className="text-gray-500 text-xs">Recruiters</p>
                <h2 className="text-3xl font-bold text-blue-600">{stats.totalRecruiters || 0}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
                <p className="text-gray-500 text-xs">Total Jobs</p>
                <h2 className="text-3xl font-bold text-green-600">{stats.totalJobs || 0}</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
                <p className="text-gray-500 text-xs">Resumes</p>
                <h2 className="text-3xl font-bold text-purple-600">{stats.totalResumes || 0}</h2>
              </div>
            </div>

            {/* Pending Alert */}
            {pendingRecruiters.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-orange-700">{pendingRecruiters.length} recruiter(s) waiting for approval!</p>
                  <p className="text-xs text-orange-500 mt-1">Review and approve/reject their accounts</p>
                </div>
                <button onClick={() => setActiveTab('pending')}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600">
                  Review Now →
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3">Recent Job Seekers</h3>
                <div className="space-y-2">
                  {stats.recentJobSeekers?.map((u, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </div>
                      <span className={"text-xs px-2 py-1 rounded-full " + (u.role === 'job_seeker_fresher' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                        {u.role === 'job_seeker_fresher' ? 'Fresher' : 'Experienced'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3">Recent Recruiters</h3>
                <div className="space-y-2">
                  {stats.recentRecruiters?.map((u, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.companyName} • {u.designation}</p>
                      </div>
                      <span className={"text-xs px-2 py-1 rounded-full " + (u.recruiterStatus === 'approved' ? 'bg-green-100 text-green-700' : u.recruiterStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}>
                        {u.recruiterStatus || 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Recruiters Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Pending Recruiter Approvals ({pendingRecruiters.length})</h3>
            {pendingRecruiters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-gray-500">No pending recruiter approvals!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRecruiters.map((u, i) => (
                  <div key={i} className="p-5 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-800">{u.name}</p>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Pending</span>
                        </div>
                        <p className="text-gray-500 text-sm">{u.email}</p>
                        <p className="text-indigo-600 font-medium text-sm mt-1">{u.companyName}</p>
                        <p className="text-gray-500 text-xs">{u.designation}</p>
                        {u.companyWebsite && (
                          <p className="text-blue-500 text-xs mt-1">{u.companyWebsite}</p>
                        )}
                        {u.gstin && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">GSTIN:</span>
                            <span className={"text-xs font-mono font-bold px-2 py-0.5 rounded " + (u.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                              {u.gstin} {u.isVerified ? '✓ Valid' : '⚠ Invalid Format'}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Registered: {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        {rejectingId === u._id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              placeholder="Rejection reason (optional)"
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              className="text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 w-52"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleRecruiterReject(u._id)}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                                Confirm Reject
                              </button>
                              <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleRecruiterApprove(u._id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                              Approve
                            </button>
                            <button onClick={() => setRejectingId(u._id)}
                              className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200">
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Payment Requests ({payments.length})</h3>
            {payments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No payment requests yet</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p, i) => (
                  <div key={i} className={"p-4 rounded-xl border " + (p.status === 'pending' ? 'bg-orange-50 border-orange-200' : p.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-800">{p.user?.name}</p>
                          <span className={"text-xs px-2 py-1 rounded-full font-bold " + (p.status === 'pending' ? 'bg-orange-100 text-orange-700' : p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm">{p.user?.email}</p>
                        <p className="text-sm mt-1">UTR: <span className="font-mono font-bold text-indigo-700">{p.utr}</span></p>
                        <p className="text-xs text-gray-400 mt-1">Amount: Rs. {p.amount} • {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      {p.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handlePaymentAction(p._id, 'approved')}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                            Approve
                          </button>
                          <button onClick={() => handlePaymentAction(p._id, 'rejected')}
                            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Job Seekers Tab */}
        {activeTab === 'jobseekers' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">All Job Seekers ({jobSeekers.length})</h3>
            <div className="space-y-3">
              {jobSeekers.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-gray-500 text-sm">{u.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={"text-xs px-2 py-1 rounded-full " + (u.role === 'job_seeker_fresher' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                        {u.role === 'job_seeker_fresher' ? 'Fresher' : 'Experienced'}
                      </span>
                      <span className={"text-xs px-2 py-1 rounded-full font-medium " + (u.plan === 'premium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
                        {u.plan === 'premium' ? 'Premium' : 'Free'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteUser(u._id)}
                    className="bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 text-sm">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recruiters Tab */}
        {activeTab === 'recruiters' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">All Recruiters ({recruiters.length})</h3>
            <div className="space-y-3">
              {recruiters.map((u, i) => (
                <div key={i} className={"flex items-center justify-between p-4 rounded-xl " + (u.recruiterStatus === 'pending' ? 'bg-orange-50 border border-orange-100' : u.recruiterStatus === 'rejected' ? 'bg-red-50 border border-red-100' : 'bg-gray-50')}>
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-gray-500 text-sm">{u.email}</p>
                    <p className="text-indigo-600 text-sm font-medium">{u.companyName}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <p className="text-gray-400 text-xs">{u.designation}</p>
                      <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (u.recruiterStatus === 'approved' ? 'bg-green-100 text-green-700' : u.recruiterStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}>
                        {u.recruiterStatus === 'approved' ? 'Approved' : u.recruiterStatus === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                      {u.gstin && (
                        <span className={"text-xs px-2 py-0.5 rounded-full " + (u.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                          {u.isVerified ? 'Valid GSTIN' : 'Invalid GSTIN'}
                        </span>
                      )}
                    </div>
                    {u.recruiterStatus === 'rejected' && u.recruiterRejectionReason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {u.recruiterRejectionReason}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {u.recruiterStatus === 'pending' && (
                      <button onClick={() => handleRecruiterApprove(u._id)}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-700">
                        Approve
                      </button>
                    )}
                    <button onClick={() => handleDeleteUser(u._id)}
                      className="bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div>
            {selectedJob ? (
              <div>
                <button onClick={() => setSelectedJob(null)}
                  className="mb-4 text-indigo-600 font-medium hover:underline text-sm">Back to Jobs</button>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{selectedJob.title}</h3>
                      <p className="text-indigo-600 font-medium">{selectedJob.company}</p>
                      <p className="text-gray-500 text-sm">{selectedJob.location} • {selectedJob.jobType} • {selectedJob.experienceLevel}</p>
                      <p className="text-gray-500 text-sm">{selectedJob.salary || 'Not Disclosed'}</p>
                    </div>
                    <button onClick={() => handleDeleteJob(selectedJob._id)}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 text-sm font-medium">
                      Delete Job
                    </button>
                  </div>
                  <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm font-semibold text-blue-700 mb-1">Posted By</p>
                    <p className="font-medium text-gray-800">{selectedJob.postedBy?.name}</p>
                    <p className="text-gray-500 text-sm">{selectedJob.postedBy?.email}</p>
                    <p className="text-indigo-600 text-sm">{selectedJob.postedBy?.companyName} • {selectedJob.postedBy?.designation}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3">Applicants ({selectedJob.applicants?.length || 0})</h4>
                    {selectedJob.applicants?.length === 0 ? (
                      <p className="text-gray-400 text-sm">No applicants yet</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedJob.applicants?.map((a, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm text-gray-800">{a.user?.name}</p>
                              <p className="text-gray-500 text-xs">{a.user?.email}</p>
                              <p className="text-gray-400 text-xs">Applied: {new Date(a.appliedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {a.matchPercent > 0 && (
                                <span className={"text-xs px-2 py-1 rounded-full font-bold " + (a.matchPercent >= 75 ? 'bg-green-100 text-green-700' : a.matchPercent >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                                  {a.matchPercent}% match
                                </span>
                              )}
                              <span className={"text-xs px-2 py-1 rounded-full font-medium " + (a.status === 'applied' ? 'bg-blue-100 text-blue-700' : a.status === 'shortlisted' ? 'bg-yellow-100 text-yellow-700' : a.status === 'interview' ? 'bg-purple-100 text-purple-700' : a.status === 'selected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                                {a.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-gray-800 mb-4">All Jobs ({jobs.length})</h3>
                <div className="space-y-3">
                  {jobs.map((job, i) => (
                    <div key={i} onClick={() => setSelectedJob(job)}
                      className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition">
                      <div>
                        <p className="font-semibold text-gray-800">{job.title}</p>
                        <p className="text-gray-500 text-sm">{job.company} • {job.location}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-400">Posted by: {job.postedBy?.name}</span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded-full">
                            {job.applicants?.length || 0} applicants
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{job.jobType}</span>
                        <span className="text-indigo-600 text-sm">View →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
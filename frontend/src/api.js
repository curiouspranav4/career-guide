import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getProfile = () => API.get('/auth/profile');

// Jobs
export const getAllJobs = () => API.get('/jobs');
export const getJobById = (id) => API.get(`/jobs/${id}`);
export const searchJobs = (skills) => API.post('/jobs/search', { skills });
export const addJob = (data) => API.post('/jobs', data);
export const deleteJob = (id) => API.delete(`/jobs/${id}`);
export const applyJob = (id) => API.post(`/jobs/${id}/apply`);
export const saveJob = (id) => API.post(`/jobs/${id}/save`);
export const getSavedJobs = () => API.get('/jobs/user/saved');
export const getAppliedJobs = () => API.get('/jobs/user/applied');
export const getRecruiterJobs = () => API.get('/jobs/recruiter/myjobs');
export const updateApplicantStatus = (jobId, userId, status) => API.put(`/jobs/${jobId}/applicant/${userId}/status`, { status });
export const postJobUpdate = (jobId, message) => API.post(`/jobs/${jobId}/update`, { message });

// Resume
export const uploadResume = (formData) => API.post('/resume/upload', formData);
export const getMyResumes = () => API.get('/resume/my');

// Admin
export const getAdminStats = () => API.get('/admin/stats');
export const getAllUsers = () => API.get('/admin/users');
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const getAllResumes = () => API.get('/admin/resumes');
export const getAllJobsAdmin = () => API.get('/admin/jobs');
export const deleteJobAdmin = (id) => API.delete(`/admin/jobs/${id}`);
export const getAllJobSeekers = () => API.get('/admin/jobseekers');
export const getAllRecruiters = () => API.get('/admin/recruiters');

export const getApplicantResume = (userId, jobId) => API.get(`/resume/user/${userId}?jobId=${jobId}`);
export const getJobMatch = (jobId) => API.get(`/resume/match/${jobId}`);
export const getCredits = () => API.get('/auth/credits');
export const deductCredits = (amount, reason) => API.post('/auth/credits/deduct', { amount, reason });
export const upgradePremium = () => API.post('/auth/upgrade');
export const updateAutoApply = (data) => API.put('/auth/auto-apply', data);

// Old manual UTR (kept for backward compat)
export const submitPaymentRequest = (utr) => API.post('/auth/payment-request', { utr });

export const getPaymentRequests = () => API.get('/admin/payments');
export const updatePaymentStatus = (id, status) => API.put('/admin/payments/' + id, { status });
export const getPendingRecruiters = () => API.get('/admin/recruiters/pending');
export const updateRecruiterStatus = (id, status, reason) => API.put('/admin/recruiters/' + id + '/status', { status, reason });

// Mock Interview
export const getInterviewLimit   = ()         => API.get('/interview/limit');
export const startInterview      = (data)     => API.post('/interview/start', data);
export const submitAnswer        = (id, data) => API.post(`/interview/${id}/answer`, data);
export const completeInterview   = (id)       => API.post(`/interview/${id}/complete`);
export const getInterviewHistory = ()         => API.get('/interview/history');
export const abandonInterview    = (id)       => API.delete(`/interview/${id}`);

// ── Razorpay Payment (NEW) ────────────────────────────────────────────────────
// Step 1: Order create karo
export const createRazorpayOrder = () =>
  API.post('/auth/payment/create-order');

// Step 2: Payment verify karo
export const verifyRazorpayPayment = (data) =>
  API.post('/auth/payment/verify', data);
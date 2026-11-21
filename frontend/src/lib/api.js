import axios from 'axios';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
  API_BASE_URL.replace(/\/api\/?$/, '');

const API = axios.create({
  baseURL: API_BASE_URL,
});

// In-memory GET cache + in-flight request deduplication
const getCache = new Map();
const inFlight = new Map();
let cachedTokenSnapshot = null;

function getCurrentToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

export function clearApiCache() {
  getCache.clear();
  inFlight.clear();
}

function cachedGet(url, ttlMs = 30000) {
  const token = getCurrentToken();
  if (cachedTokenSnapshot !== token) {
    clearApiCache();
    cachedTokenSnapshot = token;
  }

  const cacheKey = `${token.slice(-12)}:${url}`;
  const hit = getCache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) {
    return Promise.resolve(hit.response);
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const reqPromise = API.get(url)
    .then((response) => {
      getCache.set(cacheKey, {
        response,
        expiresAt: Date.now() + ttlMs,
      });
      inFlight.delete(cacheKey);
      return response;
    })
    .catch((err) => {
      inFlight.delete(cacheKey);
      throw err;
    });

  inFlight.set(cacheKey, reqPromise);
  return reqPromise;
}

API.interceptors.request.use((req) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
  }
  return req;
});

// Auto-clear GET cache whenever any write/mutation succeeds
API.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || 'get').toLowerCase();
    if (method !== 'get') {
      clearApiCache();
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export function resolveResumeUrl(fileUrl, filePath) {
  if (fileUrl && !fileUrl.includes('localhost:5000')) {
    return fileUrl;
  }
  if (filePath) {
    const clean = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${BACKEND_ORIGIN}/${clean}`;
  }
  return fileUrl || '';
}

export default API;

// Auth & Account
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getProfile = () => cachedGet('/auth/profile', 30000);
export const getCredits = () => cachedGet('/auth/credits', 20000);
export const deductCredits = (amount, reason) =>
  API.post('/auth/credits/deduct', { amount, reason });
export const updateAutoApply = (data) => API.put('/auth/auto-apply', data);

// Payments
export const createRazorpayOrder = () =>
  API.post('/auth/payment/create-order');
export const verifyRazorpayPayment = (data) =>
  API.post('/auth/payment/verify', data);
export const submitPaymentRequest = (utr) =>
  API.post('/auth/payment-request', { utr });

// Jobs
export const getAllJobs = () => cachedGet('/jobs', 45000);
export const getJobById = (id) => cachedGet(`/jobs/${id}`, 30000);
export const searchJobs = (skills) => API.post('/jobs/search', { skills });
export const addJob = (data) => API.post('/jobs', data);
export const deleteJob = (id) => API.delete(`/jobs/${id}`);
export const applyJob = (id) => API.post(`/jobs/${id}/apply`);
export const saveJob = (id) => API.post(`/jobs/${id}/save`);
export const getSavedJobs = () => cachedGet('/jobs/user/saved', 30000);
export const getAppliedJobs = () => cachedGet('/jobs/user/applied', 30000);
export const getRecruiterJobs = () => cachedGet('/jobs/recruiter/myjobs', 20000);
export const updateApplicantStatus = (jobId, userId, status) =>
  API.put(`/jobs/${jobId}/applicant/${userId}/status`, { status });
export const postJobUpdate = (jobId, message) =>
  API.post(`/jobs/${jobId}/update`, { message });

// Resume
export const uploadResume = (formData) =>
  API.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getMyResumes = () => cachedGet('/resume/my', 45000);
export const getApplicantResume = (userId, jobId) =>
  cachedGet(`/resume/user/${userId}?jobId=${jobId}`, 30000);
export const getJobMatch = (jobId) => cachedGet(`/resume/match/${jobId}`, 30000);

// Mock Interview
export const getInterviewLimit = () => cachedGet('/interview/limit', 15000);
export const startInterview = (formData) =>
  API.post('/interview/start', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const submitAnswer = (id, data) =>
  API.post(`/interview/${id}/answer`, data);
export const completeInterview = (id) => API.post(`/interview/${id}/complete`);
export const getInterviewHistory = () => cachedGet('/interview/history', 30000);
export const getInterviewDetail = (id) => cachedGet(`/interview/${id}`, 60000);
export const abandonInterview = (id) => API.delete(`/interview/${id}`);

// Admin (short TTL so moderation data stays fresh)
export const getAdminStats = () => cachedGet('/admin/stats', 10000);
export const getAllJobSeekers = () => cachedGet('/admin/jobseekers', 10000);
export const getAllRecruiters = () => cachedGet('/admin/recruiters', 10000);
export const getPendingRecruiters = () =>
  cachedGet('/admin/recruiters/pending', 10000);
export const updateRecruiterStatus = (id, status, reason) =>
  API.put(`/admin/recruiters/${id}/status`, { status, reason });
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const getAllJobsAdmin = () => cachedGet('/admin/jobs', 10000);
export const deleteJobAdmin = (id) => API.delete(`/admin/jobs/${id}`);
export const getAllResumes = () => cachedGet('/admin/resumes', 15000);
export const getPaymentRequests = () => cachedGet('/admin/payments', 10000);
export const updatePaymentStatus = (id, status) =>
  API.put(`/admin/payments/${id}`, { status });
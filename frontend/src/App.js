import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Resume from './pages/Resume';
import Admin from './pages/Admin';
import RecruiterDashboard from './pages/RecruiterDashboard';
import JobDetail from './pages/JobDetail';
import SavedJobs from './pages/SavedJobs';
import AppliedJobs from './pages/AppliedJobs';
import Companies from './pages/Companies';
import ResumeBuilder from './pages/ResumeBuilder';
import MockInterview from './pages/MockInterview'; // ← NEW

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user && user.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

const RecruiterRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user && user.role === 'recruiter' ? children : <Navigate to="/dashboard" />;
};

const JobSeekerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  const isJobSeeker = user.role === 'job_seeker_fresher' || user.role === 'job_seeker_experienced';
  if (isJobSeeker) return children;
  if (user.role === 'recruiter') return <Navigate to="/recruiter" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  return <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Job Seeker Routes */}
          <Route path="/dashboard" element={<JobSeekerRoute><Dashboard /></JobSeekerRoute>} />
          <Route path="/jobs" element={<PrivateRoute><Jobs /></PrivateRoute>} />
          <Route path="/jobs/:id" element={<PrivateRoute><JobDetail /></PrivateRoute>} />
          <Route path="/resume" element={<JobSeekerRoute><Resume /></JobSeekerRoute>} />
          <Route path="/saved-jobs" element={<JobSeekerRoute><SavedJobs /></JobSeekerRoute>} />
          <Route path="/applied-jobs" element={<JobSeekerRoute><AppliedJobs /></JobSeekerRoute>} />
          <Route path="/companies" element={<PrivateRoute><Companies /></PrivateRoute>} />

          {/* Mock Interview ← NEW */}
          <Route path="/mock-interview" element={<JobSeekerRoute><MockInterview /></JobSeekerRoute>} />

          {/* Recruiter Routes */}
          <Route path="/recruiter" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

          {/* Resume Builder */}
          <Route path="/resume-builder" element={<JobSeekerRoute><ResumeBuilder /></JobSeekerRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

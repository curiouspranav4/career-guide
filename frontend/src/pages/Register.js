import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '', email: '', password: '', 
    role: 'job_seeker_fresher',
    companyName: '', companyWebsite: '', designation: '', gstin: ''
  });
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await register(formData);
      authLogin(data.user, data.token);
      toast.success('Registration successful!');
      if (data.user.role === 'recruiter') navigate('/recruiter');
      else navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">CareerGuide AI</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text" required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
            <div className="grid grid-cols-1 gap-3">
              <label className={"flex items-center p-3 border-2 rounded-lg cursor-pointer transition " + (formData.role === 'job_seeker_fresher' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200')}>
                <input type="radio" name="role" value="job_seeker_fresher" className="mr-3"
                  checked={formData.role === 'job_seeker_fresher'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                <div>
                  <p className="font-medium text-gray-800">🎓 Job Seeker - Fresher</p>
                  <p className="text-xs text-gray-500">0-1 years experience, looking for first job</p>
                </div>
              </label>

              <label className={"flex items-center p-3 border-2 rounded-lg cursor-pointer transition " + (formData.role === 'job_seeker_experienced' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200')}>
                <input type="radio" name="role" value="job_seeker_experienced" className="mr-3"
                  checked={formData.role === 'job_seeker_experienced'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                <div>
                  <p className="font-medium text-gray-800">💼 Job Seeker - Experienced</p>
                  <p className="text-xs text-gray-500">1+ years experience, looking to switch/grow</p>
                </div>
              </label>

              <label className={"flex items-center p-3 border-2 rounded-lg cursor-pointer transition " + (formData.role === 'recruiter' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200')}>
                <input type="radio" name="role" value="recruiter" className="mr-3"
                  checked={formData.role === 'recruiter'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                <div>
                  <p className="font-medium text-gray-800">🏢 Recruiter</p>
                  <p className="text-xs text-gray-500">Post jobs and find talented candidates</p>
                </div>
              </label>
            </div>
          </div>

          {/* Recruiter Extra Fields */}
          {formData.role === 'recruiter' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-700">Company Details</p>
              <input
                type="text" required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Company Name *"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your Designation (e.g. HR Manager)"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Company Website (optional)"
                value={formData.companyWebsite}
                onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
              />
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="GSTIN Number (e.g. 22AAAAA0000A1Z5)"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-blue-600">Valid GSTIN se Verified badge milega recruiter profile pe</p>
            </div>
          )}

          {/* Free Plan Info for Job Seekers */}
          {(formData.role === 'job_seeker_fresher' || formData.role === 'job_seeker_experienced') && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-xs text-green-700 font-medium">Free Plan — 50 credits/month</p>
              <p className="text-xs text-green-600 mt-1">Resume build: 15 credits • Upgrade anytime for premium features</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
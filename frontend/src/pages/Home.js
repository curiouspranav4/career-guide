import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <h1 className="text-xl font-bold text-indigo-600">CareerGuide AI</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/login')} className="px-4 py-2 text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg transition">Login</button>
          <button onClick={() => navigate('/register')} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition">Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-block bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          🚀 AI-Powered Career Guidance Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
          Find Your Dream Career<br />
          <span className="text-indigo-600">With AI Intelligence</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Upload your resume, let our AI analyze your skills, and get personalized job recommendations tailored just for you.
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate('/register')} className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-lg shadow-lg">
            Get Started Free →
          </button>
          <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition text-lg shadow border border-indigo-200">
            Sign In
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Why CareerGuide AI?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '🧠', title: 'AI Resume Analysis', desc: 'Our NLP engine extracts skills from your resume automatically and matches them with job requirements.' },
            { icon: '💼', title: 'Smart Job Matching', desc: 'Get personalized job recommendations based on your skills, experience level and career interests.' },
            { icon: '📊', title: 'Career Analytics', desc: 'Track your applications, view skill gaps and get insights to improve your career prospects.' }
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-8 text-center hover:shadow-lg transition">
              <div className="text-5xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{f.title}</h3>
              <p className="text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-indigo-600 mx-6 md:mx-20 rounded-3xl p-12 text-center text-white mb-16">
        <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Career?</h2>
        <p className="text-indigo-200 mb-8 text-lg">Join thousands of students who found their dream jobs using CareerGuide AI</p>
        <button onClick={() => navigate('/register')} className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition">
          Start For Free →
        </button>
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-400 py-8">
        <p>© 2026 CareerGuide AI. Built with MERN Stack + NLP</p>
      </footer>
    </div>
  );
};

export default Home;
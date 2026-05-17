import React, { useState, useEffect } from 'react';
import { uploadResume, getMyResumes } from '../api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Resume = () => {
  const [file, setFile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const { data } = await getMyResumes();
      setResumes(data);
    } catch {
      toast.error('Failed to load resumes');
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a PDF file');
    if (file.type !== 'application/pdf') return toast.error('Only PDF files allowed');

    setUploading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const { data } = await uploadResume(formData);
      toast.success(`Resume uploaded! Found ${data.extractedSkills.length} skills`);
      setFile(null);
      fetchResumes();
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <h1 className="text-xl font-bold">CareerGuide AI</h1>
        </div>
        <button onClick={() => navigate('/dashboard')} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition">
          ← Dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Resume Analyzer 📄</h2>
        <p className="text-gray-500 mb-8">Upload your resume to get AI-powered job recommendations</p>

        {/* Upload Box */}
        <div className="bg-white rounded-2xl shadow p-8 mb-8">
          <div
            className="border-2 border-dashed border-indigo-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
          >
            <p className="text-5xl mb-4">📁</p>
            <p className="text-gray-600 font-medium mb-2">Drag & drop your resume here</p>
            <p className="text-gray-400 text-sm mb-4">or</p>
            <label className="bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition">
              Browse File
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
            {file && <p className="mt-4 text-green-600 font-medium">✅ {file.name}</p>}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {uploading ? '🔄 Analyzing Resume...' : '🚀 Upload & Analyze'}
          </button>
        </div>

        {/* Previous Resumes */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Previous Resumes</h3>
          {loading ? (
            <p className="text-gray-400 text-center py-4">Loading...</p>
          ) : resumes.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No resumes uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {resumes.map((resume, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">📄 {resume.fileName}</p>
                      <p className="text-gray-400 text-sm">{new Date(resume.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                      {resume.extractedSkills?.length} skills found
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resume.extractedSkills?.map((skill, j) => (
                      <span key={j} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs capitalize">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Resume;
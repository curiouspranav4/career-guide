import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyResumes, getAllJobs, getAppliedJobs, getSavedJobs, getCredits, updateAutoApply, createRazorpayOrder, verifyRazorpayPayment } from '../api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompaniesDropdown, setShowCompaniesDropdown] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState(null);
  const [showAutoApplySettings, setShowAutoApplySettings] = useState(false);

  // const [showPaymentModal, setShowPaymentModal] = useState(false);
  // const [utr, setUtr] = useState('');
  // const [submitting, setSubmitting] = useState(false);
  // const [autoApplyThreshold, setAutoApplyThreshold] = useState(75);
  // const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  // const [savingAutoApply, setSavingAutoApply] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(75);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [preferredLocations, setPreferredLocations] = useState('');    // NEW
  const [minExpectedSalary, setMinExpectedSalary] = useState(0);       // NEW
  const [savingAutoApply, setSavingAutoApply] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [resumeRes, jobRes] = await Promise.all([getMyResumes(), getAllJobs()]);
      const resumeData = resumeRes.data;
      const jobsData = jobRes.data;
      setResumes(resumeData);
      if (resumeData.length > 0 && jobsData.length > 0) {
        const skills = resumeData[0].extractedSkills || [];
        const matched = jobsData.filter(job =>
          job.requiredSkills?.some(skill =>
            skills.some(s => s.toLowerCase() === skill.toLowerCase())
          )
        );
        const updatedResume = { ...resumeData[0], recommendedJobs: matched };
        setResumes([updatedResume, ...resumeData.slice(1)]);
        setJobs(jobsData);
      } else {
        setJobs(jobsData);
      }
    } catch (error) {
      toast.error('Failed to load data');
    }

    try {
      const appliedRes = await getAppliedJobs();
      setAppliedJobs(appliedRes.data);
    } catch(e) {}

    try {
      const savedRes = await getSavedJobs();
      setSavedJobs(savedRes.data);
    } catch(e) {}

    try {
      const creditsRes = await getCredits();
      setCreditsInfo(creditsRes.data);
      // setAutoApplyEnabled(creditsRes.data.autoApplyEnabled || false);
      // setAutoApplyThreshold(creditsRes.data.autoApplyThreshold || 75);

      setAutoApplyEnabled(creditsRes.data.autoApplyEnabled || false);
      setAutoApplyThreshold(creditsRes.data.autoApplyThreshold || 75);
      // Load new filter fields
      setPreferredLocations((creditsRes.data.preferredLocations || []).join(', '));
      setMinExpectedSalary(creditsRes.data.minExpectedSalary || 0);

    } catch(e) {}

    setLoading(false);
  };

  // const handleSubmitUTR = async () => {
  //   if (!utr || utr.length < 10) {
  //     toast.error('Please enter a valid UTR number (min 10 characters)');
  //     return;
  //   }
  //   setSubmitting(true);
  //   try {
  //     await submitPaymentRequest(utr);
  //     toast.success('Payment request submitted! Admin will verify and upgrade your account shortly.');
  //     setShowPaymentModal(false);
  //     setUtr('');
  //   } catch(e) {
  //     toast.error(e.response?.data?.message || 'Submission failed');
  //   }
  //   setSubmitting(false);
  // };

  const handleRazorpayPayment = async () => {
    setPaymentLoading(true);
    try {
      // Step 1: Backend se order create karo
      const orderRes = await createRazorpayOrder();
      const { orderId, amount, currency, keyId, prefill } = orderRes.data;
 
      // Step 2: Razorpay checkout open karo
      const options = {
        key:      keyId,
        amount:   amount,         // paise mein
        currency: currency,
        name:     'CareerGuide AI',
        description: 'Premium Plan — ₹99/month',
        order_id: orderId,
        prefill: {
          name:  prefill?.name  || '',
          email: prefill?.email || '',
        },
        theme: { color: '#4F46E5' },  // indigo color
        // Payment success hone pe ye call hoga
        handler: async (response) => {
          try {
            // Step 3: Backend se verify karo
            await verifyRazorpayPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            toast.success('🎉 Payment successful! Premium activated instantly!');
            setShowPaymentModal(false);
            fetchData(); // dashboard refresh karo
          } catch (verifyErr) {
            toast.error('Payment verification failed: ' + (verifyErr.response?.data?.message || verifyErr.message));
          }
        },
        // Payment window band ho jaye (user ne cancel kiya)
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
            toast.info('Payment cancelled.');
          }
        }
      };
 
      // Razorpay script load check
      if (!window.Razorpay) {
        toast.error('Razorpay load nahi hua. Page refresh karo.');
        setPaymentLoading(false);
        return;
      }
 
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error('Payment failed: ' + response.error.description);
        setPaymentLoading(false);
      });
      rzp.open();
 
    } catch (e) {
      toast.error('Payment start nahi hua: ' + (e.response?.data?.message || e.message));
    }
    setPaymentLoading(false);
  };

  // const handleSaveAutoApply = async () => {
  //   setSavingAutoApply(true);
  //   try {
  //     await updateAutoApply({ autoApplyEnabled, autoApplyThreshold });
  //     toast.success('Auto-apply settings saved!');
  //     setShowAutoApplySettings(false);
  //     fetchData();
  //   } catch(e) {
  //     toast.error('Failed to save settings');
  //   }
  //   setSavingAutoApply(false);
  // };

  const handleSaveAutoApply = async () => {
    setSavingAutoApply(true);
    try {
      // preferredLocations string ko array mein convert karo
      const locationsArray = preferredLocations
        .split(',')
        .map(l => l.trim())
        .filter(l => l.length > 0);
 
      await updateAutoApply({
        autoApplyEnabled,
        autoApplyThreshold,
        preferredLocations: locationsArray,          // NEW
        minExpectedSalary:  Number(minExpectedSalary) || 0,  // NEW
      });
      toast.success('Auto-apply settings saved!');
      setShowAutoApplySettings(false);
      fetchData();
    } catch(e) {
      toast.error('Failed to save settings');
    }
    setSavingAutoApply(false);
  };

  const latestResume = resumes[0];
  const isFresher = user?.role === 'job_seeker_fresher';
  const isPremium = creditsInfo?.plan === 'premium';

  const statusColors = {
    applied: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-yellow-100 text-yellow-700',
    interview: 'bg-purple-100 text-purple-700',
    selected: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  const companies = [...new Set(jobs.map(j => j.company))].slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Payment Modal */}
      {/* {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Upgrade to Premium</h3>
              <button onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold">x</button>
            </div>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
              <p className="font-bold text-indigo-700 mb-2">Premium Plan — Rs. 99/month</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>1000 credits/month (vs 50 free)</li>
                <li>Resume build: 10 credits (vs 15)</li>
                <li>10 premium resume templates</li>
                <li>AI Mock Interview: 50 credits/session</li>
                <li>Auto-apply feature: 50 credits/apply</li>
              </ul>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Pay Rs. 99 via PhonePe</p>
              <div className="bg-black rounded-xl p-4 inline-block">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=pranavsharma5665@ybl&pn=PranavSharma&am=99&cu=INR&tn=CareerGuide_Premium"
                  alt="PhonePe QR"
                  className="w-44 h-44"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">UPI ID: pranavsharma5665@ybl</p>
              <p className="text-xs text-gray-500">Amount: Rs. 99</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter UTR / Transaction ID
              </label>
              <input
                type="text"
                placeholder="e.g. 407612345678 (12 digit UTR)"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">UTR number can be found in PhonePe transaction history</p>
            </div>
            <button onClick={handleSubmitUTR} disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Payment Request'}
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">
              Admin will verify — Premium will be activated within 24 hours
            </p>
          </div>
        </div>
      )} */}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Upgrade to Premium</h3>
              <button onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            </div>
 
            {/* Plan details */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-5">
              <p className="font-bold text-indigo-700 mb-2">Premium Plan — ₹99/month</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✅ 1000 credits/month (vs 50 free)</li>
                <li>✅ 10 Mock Interviews/day (vs 1)</li>
                <li>✅ 10 premium resume templates</li>
                <li>✅ Auto-Apply with location + salary filters</li>
                <li>✅ Payment instant — no manual verification</li>
              </ul>
            </div>
 
            {/* Pay button */}
            <button
              onClick={handleRazorpayPayment}
              disabled={paymentLoading}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 text-base"
            >
              {paymentLoading ? '⏳ Opening payment...' : '💳 Pay ₹99 via Razorpay'}
            </button>
 
            <p className="text-xs text-center text-gray-400 mt-3">
              UPI • Debit/Credit Card • Net Banking • Wallets — sab supported hai
            </p>
            <p className="text-xs text-center text-green-600 mt-1 font-medium">
              ⚡ Premium instant activate hoga — koi wait nahi
            </p>
          </div>
        </div>
      )}

      {/* Auto Apply Settings Modal */}
      {showAutoApplySettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Auto-Apply Settings</h3>
              <button onClick={() => setShowAutoApplySettings(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold">x</button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-700 font-medium mb-1">How Auto-Apply Works</p>
              <p className="text-xs text-yellow-600">When a new job is posted, if your resume matches the required skills above your set threshold, you will be automatically applied. Cost: 50 credits per auto-apply.</p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
              <div>
                <p className="font-medium text-gray-800 text-sm">Enable Auto-Apply</p>
                <p className="text-xs text-gray-500">Automatically apply to matching jobs</p>
              </div>
              <button
                onClick={() => setAutoApplyEnabled(!autoApplyEnabled)}
                className={"w-12 h-6 rounded-full transition-colors relative " + (autoApplyEnabled ? 'bg-green-500' : 'bg-gray-300')}>
                <div className={"w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform " + (autoApplyEnabled ? 'translate-x-6' : 'translate-x-0.5')}></div>
              </button>
            </div>

            {/* Threshold Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Match Threshold</label>
                <span className={"text-lg font-bold " + (autoApplyThreshold >= 75 ? 'text-green-600' : autoApplyThreshold >= 50 ? 'text-yellow-600' : 'text-red-600')}>
                  {autoApplyThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={autoApplyThreshold}
                onChange={e => setAutoApplyThreshold(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50% (More applies)</span>
                <span>100% (Exact match)</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Jobs with {autoApplyThreshold}% or more skill match will be auto-applied.
              </p>
            </div>

            {/* ── NEW: Preferred Locations ── */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Locations
                <span className="text-xs text-gray-400 ml-1">(comma separated, blank = all locations)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Noida, Delhi, Remote, Bangalore"
                value={preferredLocations}
                onChange={e => setPreferredLocations(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Auto-apply only in these cities. Leave blank to apply everywhere.
              </p>
            </div>
 
            {/* ── NEW: Minimum Expected Salary ── */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">Minimum Expected Salary</label>
                <span className={`text-base font-bold ${minExpectedSalary > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {minExpectedSalary > 0 ? `${minExpectedSalary} LPA` : 'No Filter'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={minExpectedSalary}
                onChange={e => setMinExpectedSalary(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 (No filter)</span>
                <span>50 LPA</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {minExpectedSalary > 0
                  ? `Only auto-apply to jobs offering ≥ ${minExpectedSalary} LPA`
                  : 'Apply to jobs regardless of salary'}
              </p>
            </div>

            {/* Current Credits */}
            <div className="p-3 bg-indigo-50 rounded-xl mb-4 flex justify-between items-center">
              <span className="text-sm text-indigo-700">Available Credits</span>
              <span className="font-bold text-indigo-700">{creditsInfo?.credits || 0}</span>
            </div>

            <button onClick={handleSaveAutoApply} disabled={savingAutoApply}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {savingAutoApply ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span className="font-bold text-xl text-indigo-700">CareerGuide AI</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <button onClick={() => navigate('/dashboard')}
                className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg">
                Dashboard
              </button>
              <button onClick={() => navigate('/jobs')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                Jobs
              </button>
              <div className="relative">
                <button onClick={() => setShowCompaniesDropdown(!showCompaniesDropdown)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg flex items-center gap-1">
                  Companies
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCompaniesDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 p-2">
                    <p className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase tracking-wide">Companies Hiring</p>
                    {companies.map((company, i) => (
                      <button key={i}
                        onClick={() => { navigate('/companies'); setShowCompaniesDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded font-bold text-xs flex items-center justify-center">
                          {company.charAt(0)}
                        </span>
                        {company}
                      </button>
                    ))}
                    <div className="border-t mt-1 pt-1">
                      <button onClick={() => { navigate('/companies'); setShowCompaniesDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg">
                        View All Companies →
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/resume')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                Resume
              </button>
              <button onClick={() => navigate('/resume-builder')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                Build Resume
              </button>
              <button onClick={() => navigate('/mock-interview')}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg">
                🎙️ Mock Interview
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">👋 {user?.name}</span>
            <span className={"text-xs px-2 py-1 rounded-full font-medium " + (isFresher ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
              {isFresher ? 'Fresher' : 'Experienced'}
            </span>
            {creditsInfo && (
              <span className={"text-xs px-2 py-1 rounded-full font-bold " + (isPremium ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
                {isPremium ? 'Premium' : 'Free'}
              </span>
            )}
            {creditsInfo && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
                {creditsInfo.credits} credits
              </span>
            )}
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {showCompaniesDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowCompaniesDropdown(false)}></div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Plan & Credits Banner */}
        {creditsInfo && (
          <div className={"rounded-2xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3 " + (isPremium ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200')}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={"text-sm font-bold px-3 py-1 rounded-full " + (isPremium ? 'bg-yellow-400 text-white' : 'bg-indigo-200 text-indigo-800')}>
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </span>
                <span className="text-sm text-gray-600">
                  {creditsInfo.credits} / {isPremium ? '1000' : '50'} credits remaining
                </span>
              </div>
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div
                  className={"h-2 rounded-full " + (isPremium ? 'bg-yellow-400' : 'bg-indigo-500')}
                  style={{ width: Math.min(Math.round((creditsInfo.credits / (isPremium ? 1000 : 50)) * 100), 100) + '%' }}>
                </div>
              </div>
              {!isPremium && (
                <p className="text-xs text-gray-500 mt-1">Resume build: 15 credits • Resets monthly</p>
              )}
              {isPremium && (
                <p className="text-xs text-gray-500 mt-1">Resume build: 10 credits • Mock Interview: 50 credits • Auto-apply: 50 credits</p>
              )}
            </div>
            {!isPremium && (
              <button onClick={() => setShowPaymentModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Upgrade to Premium — Rs. 99/mo
              </button>
            )}
            {isPremium && (
              <div className="text-right">
                <p className="text-yellow-600 font-bold text-sm">Active Premium</p>
                <p className="text-xs text-gray-500">1000 credits/month</p>
                <button onClick={() => setShowAutoApplySettings(true)}
                  className="mt-2 text-xs bg-yellow-400 text-white px-3 py-1 rounded-lg hover:bg-yellow-500">
                  Auto-Apply Settings {autoApplyEnabled ? '(ON)' : '(OFF)'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-indigo-500">
            <p className="text-gray-500 text-xs">Jobs Available</p>
            <h2 className="text-3xl font-bold text-indigo-600">{jobs.length}</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-gray-500 text-xs">Applied Jobs</p>
            <h2 className="text-3xl font-bold text-green-600">{appliedJobs.length}</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-xs">Saved Jobs</p>
            <h2 className="text-3xl font-bold text-yellow-600">{savedJobs.length}</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-gray-500 text-xs">Skills Detected</p>
            <h2 className="text-3xl font-bold text-purple-600">{latestResume?.extractedSkills?.length || 0}</h2>
          </div>
        </div>

        {/* Mock Interview Quick Action */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-white font-bold text-lg">🎙️ AI Mock Interview</h3>
            <p className="text-indigo-200 text-sm mt-0.5">
              Voice-based interview practice with real-time AI feedback
            </p>
            <p className="text-indigo-300 text-xs mt-1">
              {creditsInfo?.plan === 'premium' ? '⭐ 10 interviews/day (Premium)' : '🆓 1 interview/day (Free)'}
            </p>
          </div>
          <button
            onClick={() => navigate('/mock-interview')}
            className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-all shrink-0"
          >
            Start Interview →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skills */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Detected Skills</h3>
              <button onClick={() => navigate('/resume')}
                className="text-xs text-indigo-600 hover:underline">Update Resume</button>
            </div>
            {latestResume?.extractedSkills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {latestResume.extractedSkills.map((skill, i) => (
                  <span key={i} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-3">No resume uploaded yet</p>
                <button onClick={() => navigate('/resume')}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                  Upload Resume
                </button>
              </div>
            )}
          </div>

          {/* Recommended Jobs */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Recommended Jobs</h3>
              <button onClick={() => navigate('/jobs')} className="text-xs text-indigo-600 hover:underline">View All</button>
            </div>
            {latestResume?.recommendedJobs?.length > 0 ? (
              <div className="space-y-3">
                {latestResume.recommendedJobs.slice(0, 4).map((job, i) => (
                  <div key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                    onClick={() => navigate('/jobs/' + job._id)}>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company} • {job.location}</p>
                    </div>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">{job.jobType}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Upload resume to get recommendations</p>
              </div>
            )}
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Recent Applications</h3>
              <button onClick={() => navigate('/applied-jobs')} className="text-xs text-indigo-600 hover:underline">View All</button>
            </div>
            {appliedJobs.length > 0 ? (
              <div className="space-y-3">
                {appliedJobs.slice(0, 3).map((job, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company}</p>
                    </div>
                    <span className={"text-xs px-2 py-1 rounded-full font-medium " + statusColors[job.applicationStatus]}>
                      {job.applicationStatus}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-3">No applications yet</p>
                <button onClick={() => navigate('/jobs')}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm">
                  Browse Jobs
                </button>
              </div>
            )}
          </div>

          {/* Saved Jobs Preview */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Saved Jobs</h3>
              <button onClick={() => navigate('/saved-jobs')} className="text-xs text-indigo-600 hover:underline">View All</button>
            </div>
            {savedJobs.length > 0 ? (
              <div className="space-y-3">
                {savedJobs.slice(0, 3).map((job, i) => (
                  <div key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 cursor-pointer"
                    onClick={() => navigate('/jobs/' + job._id)}>
                    <div>
                      <p className="font-medium text-sm text-gray-800">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company} • {job.location}</p>
                    </div>
                    <span className="text-xs text-indigo-600">View →</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-3">No saved jobs yet</p>
                <button onClick={() => navigate('/jobs')}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm">
                  Browse Jobs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
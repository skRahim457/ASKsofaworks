import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginRegister() {
  const { login, register, loginWithFirebase, loginWithGoogle, token, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auth Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Register Fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Login method: 'otp' | 'email'
  const [loginMethod, setLoginMethod] = useState('email');
  
  // OTP Sign-in fields (initialized blank for privacy)
  const [otpName, setOtpName] = useState('');
  const [otpMobile, setOtpMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [mockOtp, setMockOtp] = useState('');

  // Email/Password fields (Admin/Legacy fallback)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Simulated Google Popup state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [showGoogleInputs, setShowGoogleInputs] = useState(false);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract redirect query parameter
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || '/';

  // Sync authMode with URL 'mode' query param (login vs register)
  useEffect(() => {
    const mode = queryParams.get('mode');
    if (mode === 'register') {
      setAuthMode('register');
    } else {
      setAuthMode('login');
    }
  }, [location.search]);

  // Redirect if already authenticated
  useEffect(() => {
    if (token) {
      navigate(redirectPath);
    }
  }, [token, navigate, redirectPath]);

  // Handle traditional email login
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!email.trim() || !password.trim()) {
      setFormError('Mobile number or email and password are required.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle registration submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regMobile.trim()) {
      setFormError('Name, mobile number, email, and password are required.');
      return;
    }

    if (!/^\d{10}$/.test(regMobile.trim())) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      await register(regName.trim(), regEmail.trim(), regPassword.trim(), regMobile.trim());
      setFormSuccess('Registration successful! Logging you in...');
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to initialize Firebase invisible reCAPTCHA
  const setupRecaptcha = () => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please check that you configured all Firebase keys in your frontend .env file.');
    }
    if (window.recaptchaVerifier) return;
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA solved
      }
    });
  };

  // Handle Send OTP via Firebase Phone Auth
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!otpName.trim()) {
      setFormError('Name is required.');
      return;
    }

    if (!otpMobile.trim()) {
      setFormError('Mobile number is required.');
      return;
    }

    if (!/^\d{10}$/.test(otpMobile.trim())) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    
    // 1. Sandbox Mock Fallback (Bypasses recaptcha and sends simulated OTP if config is missing)
    if (!auth) {
      setIsMockMode(true);
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setMockOtp(generatedCode);
      setOtpSent(true);
      setFormSuccess('OTP generated successfully (Sandbox Mode)!');
      alert(`[Sandbox SMS Gateway]\n\nSMS sent to +91 ${otpMobile.trim()}:\n"Your ASK Sofa works login verification code is: ${generatedCode}"`);
      setLoading(false);
      return;
    }

    // 2. Real Firebase Phone Authentication
    try {
      setIsMockMode(false);
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = `+91${otpMobile.trim()}`; // Enforce India country code (+91)
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setFormSuccess('Verification OTP sent successfully via SMS!');
    } catch (err) {
      console.error('Firebase SMS Sending failed:', err);
      setFormError(err.message || 'Failed to send OTP. Please check your config and try again.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP and exchange with backend
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setFormError('Please enter the 6-digit verification OTP code.');
      return;
    }

    setLoading(true);

    // 1. Sandbox Mock Bypass Verification
    if (isMockMode) {
      if (otpCode.trim() !== mockOtp) {
        setFormError('Incorrect verification OTP. Please try again.');
        setLoading(false);
        return;
      }
      try {
        setFormSuccess('OTP Verified! Logging in...');
        await loginWithFirebase('mock-demo-token', otpName.trim(), otpMobile.trim());
        setFormSuccess('Sign-in successful!');
      } catch (err) {
        console.error('Mock login verification error:', err);
        setFormError(err.message || 'Incorrect OTP code. Please check and retry.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. Real Firebase Authentication ID Token verification
    if (!confirmationResult) {
      setFormError('No active verification session found. Please send the OTP again.');
      setLoading(false);
      return;
    }

    try {
      // Verify OTP code with Firebase Client SDK
      const credential = await confirmationResult.confirm(otpCode.trim());
      
      // Fetch Firebase ID Token
      const idToken = await credential.user.getIdToken();
      
      // Send ID Token to backend to get custom JWT and sign in
      setFormSuccess('OTP Verified! Registering/Logging in...');
      await loginWithFirebase(idToken, otpName.trim(), otpMobile.trim());
      setFormSuccess('Sign-in successful!');
    } catch (err) {
      console.error('Firebase verification error:', err);
      setFormError(err.message || 'Incorrect OTP code. Please check and retry.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Mock Google login selection
  const handleGoogleSelect = async (selectedEmail, selectedName) => {
    setLoading(true);
    setFormError('');
    setFormSuccess('');
    setShowGoogleModal(false);

    try {
      const dummyGoogleId = 'google_oauth_' + Math.random().toString(36).substr(2, 9);
      await loginWithGoogle(selectedEmail, selectedName, dummyGoogleId);
      setFormSuccess('Google Sign-in successful!');
    } catch (err) {
      console.error(err);
      setFormError('Failed to sign in with Google. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-padding" style={{ display: 'flex', alignItems: 'center', minHeight: '80vh', backgroundColor: 'var(--color-bg-cream)' }}>
      <div className="section-container" style={{ maxWidth: '460px', width: '100%', margin: '0 auto' }}>
        
        <div style={{
          backgroundColor: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="subtitle" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>ASK Sofa works</span>
            <h2 className="heading-md" style={{ margin: '0.2rem 0 0.5rem', fontFamily: 'var(--font-serif)', fontSize: '1.6rem' }}>
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              Access your luxurious design workspace, orders, and wishlist.
            </p>
          </div>

          {/* Feedback messages */}
          {formError && (
            <div style={{ marginBottom: '1.2rem', padding: '0.8rem', backgroundColor: '#FFEBEE', color: 'var(--color-error)', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'center', fontWeight: '500' }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ marginBottom: '1.2rem', padding: '0.8rem', backgroundColor: '#E8F5E9', color: 'var(--color-success)', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'center', fontWeight: '500' }}>
              {formSuccess}
            </div>
          )}

          {authMode === 'login' ? (
            <>
              {/* Google Sign In option */}
              <button 
                type="button" 
                className="btn btn-secondary btn-full"
                style={{ 
                  height: '46px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.8rem', 
                  marginBottom: '1.5rem',
                  backgroundColor: '#FFFFFF',
                  borderColor: '#D1D5DB',
                  color: '#374151',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.88rem'
                }}
                onClick={() => setShowGoogleModal(true)}
              >
                {/* Google Logo G vector */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.79 5.79 0 0 1 8.2 12.728a5.79 5.79 0 0 1 5.79-5.79c1.498 0 2.86.574 3.882 1.506l3.14-3.14a10.22 10.22 0 0 0-7.022-2.52C8.256 2.784 3.5 7.54 3.5 13.279c0 5.74 4.756 10.495 10.496 10.495 6.027 0 9.99-4.237 9.99-10.18a9.4 9.4 0 0 0-.158-1.78l-11.588-.029Z" />
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '0.75rem' }}>
                <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>OR</span>
                <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
              </div>

              {/* MAIN SIGN IN METHODS */}
              {loginMethod === 'otp' ? (
                /* OTP Sign In Form */
                <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
                  {!otpSent ? (
                    <>
                      {/* Name Input */}
                      <div className="form-group">
                        <label className="form-label">Name</label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="Name"
                          value={otpName}
                          onChange={(e) => setOtpName(e.target.value)}
                        />
                      </div>

                      {/* Mobile Number Input */}
                      <div className="form-group">
                        <label className="form-label">Mobile Number</label>
                        <input 
                          type="tel" 
                          className="form-control"
                          placeholder="Mobile Number"
                          value={otpMobile}
                          onChange={(e) => setOtpMobile(e.target.value)}
                          maxLength="10"
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-primary btn-full"
                        style={{ height: '46px', marginTop: '1.25rem' }}
                        disabled={loading}
                      >
                        {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Static Details Box with Change option */}
                      <div style={{ 
                        backgroundColor: 'var(--color-light-gray)', 
                        border: '1px solid var(--color-border)', 
                        borderRadius: '6px', 
                        padding: '1rem', 
                        marginBottom: '1.5rem', 
                        fontSize: '0.85rem' 
                      }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: 'var(--color-text-muted)' }}>Name:</strong>{' '}
                          <span>{otpName || 'Guest Customer'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: 'var(--color-text-muted)' }}>Mobile Number:</strong>{' '}
                            <span>{otpMobile}</span>
                          </div>
                          <button 
                            type="button" 
                            style={{ fontSize: '0.75rem', color: 'var(--color-gold-dark)', fontWeight: 'bold' }}
                            onClick={() => { setOtpSent(false); setFormSuccess(''); }}
                          >
                            Change
                          </button>
                        </div>
                      </div>

                      {/* OTP Code Entry */}
                      <div className="form-group">
                        <label className="form-label">Enter 6-Digit OTP Code</label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="e.g. 123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength="6"
                          style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-gold btn-full"
                        style={{ height: '46px', marginTop: '0.5rem' }}
                        disabled={loading}
                      >
                        {loading ? 'Verifying...' : 'Verify OTP & Complete Sign In'}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                        <button 
                          type="button" 
                          style={{ fontSize: '0.75rem', color: 'var(--color-gold-dark)', fontWeight: 'bold' }}
                          onClick={handleSendOtp}
                          disabled={loading}
                        >
                          Resend Verification OTP
                        </button>
                      </div>
                    </>
                  )}
                </form>
              ) : (
                /* Email/Password Form (Legacy/Admin) */
                <form onSubmit={handleEmailSubmit}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number or Email Address</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Enter mobile number or email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input 
                      type="password" 
                      className="form-control"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-full"
                    style={{ height: '46px', marginTop: '1.25rem' }}
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
              )}

              {/* Toggle between OTP and Email Login */}
              <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.2rem', fontSize: '0.8rem' }}>
                {loginMethod === 'otp' ? (
                  <button 
                    type="button" 
                    style={{ color: 'var(--color-text-muted)', fontWeight: 500, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => { setLoginMethod('email'); setFormError(''); setFormSuccess(''); }}
                  >
                    Login with Mobile/Email & Password instead
                  </button>
                ) : (
                  <button 
                    type="button" 
                    style={{ color: 'var(--color-gold-dark)', fontWeight: 600, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => { setLoginMethod('otp'); setFormError(''); setFormSuccess(''); }}
                  >
                    Login using Mobile & OTP code
                  </button>
                )}
              </div>

              {/* Toggle to Register */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '1.2rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Don't have an account? </span>
                <button 
                  type="button" 
                  style={{ color: 'var(--color-gold-dark)', fontWeight: 'bold', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                  onClick={() => { setAuthMode('register'); setFormError(''); setFormSuccess(''); }}
                >
                  Sign Up
                </button>
              </div>
            </>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input 
                  type="tel" 
                  className="form-control"
                  placeholder="Mobile Number"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  maxLength="10"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control"
                  placeholder="Email Address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control"
                  placeholder="Create a secure password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                style={{ height: '46px', marginTop: '1.5rem' }}
                disabled={loading}
              >
                {loading ? 'Signing up...' : 'Sign Up'}
              </button>

              {/* Toggle to Login */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '1.2rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Already have an account? </span>
                <button 
                  type="button" 
                  style={{ color: 'var(--color-gold-dark)', fontWeight: 'bold', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                  onClick={() => { setAuthMode('login'); setFormError(''); setFormSuccess(''); }}
                >
                  Login instead
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

      {/* ==========================================================================
         SIMULATED GOOGLE POPUP WINDOW
         ========================================================================== */}
      {showGoogleModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '380px', borderRadius: '8px' }}>
            <div className="modal-header" style={{ padding: '1rem 1.5rem', backgroundColor: '#F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.79 5.79 0 0 1 8.2 12.728a5.79 5.79 0 0 1 5.79-5.79c1.498 0 2.86.574 3.882 1.506l3.14-3.14a10.22 10.22 0 0 0-7.022-2.52C8.256 2.784 3.5 7.54 3.5 13.279c0 5.74 4.756 10.495 10.496 10.495 6.027 0 9.99-4.237 9.99-10.18a9.4 9.4 0 0 0-.158-1.78l-11.588-.029Z" />
                </svg>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Sign in with Google</span>
              </div>
              <button onClick={() => {
                setShowGoogleModal(false);
                setShowGoogleInputs(false);
                setGoogleEmail('');
                setGoogleName('');
              }} style={{ fontSize: '1.1rem', color: '#9CA3AF' }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (googleEmail.trim() && googleName.trim()) {
                  handleGoogleSelect(googleEmail.trim(), googleName.trim());
                } else {
                  alert('Please enter both name and email.');
                }
              }}>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '1.25rem' }}>
                  Sign in using your Google credentials:
                </p>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '0.25rem' }}>Google Email Address</label>
                  <input 
                    type="email" 
                    className="form-control"
                    placeholder="name@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    required
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '0.25rem' }}>Full Name</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="John Doe"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    required
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ textTransform: 'none', height: '36px', padding: '0 1rem' }}
                    onClick={() => {
                      setShowGoogleModal(false);
                      setGoogleEmail('');
                      setGoogleName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm"
                    style={{ textTransform: 'none', height: '36px', padding: '0 1.25rem' }}
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invisible Recaptcha Container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>
    </section>
  );
}

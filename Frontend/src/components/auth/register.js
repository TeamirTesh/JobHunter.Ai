import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { authAPI } from '../../services/api';

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.register({
        username: formData.name, // Backend expects 'username' field
        email: formData.email,
        password: formData.password
      });
      
      // For now, we'll use the form data for user info
      // We'll improve this when we add proper user data fetching
      onRegister({
        id: 1, // We'll get this from the response later
        name: formData.name,
        email: formData.email
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsOAuthLoading(true);
    setError('');
    try {
      const response = await authAPI.getGoogleAuthUrl();
      // Redirect to Google OAuth
      window.location.href = response.authorization_url;
    } catch (err) {
      setError(err.message || 'Failed to initiate Google login');
      setIsOAuthLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsOAuthLoading(true);
    setError('');
    try {
      const response = await authAPI.getMicrosoftAuthUrl();
      // Redirect to Microsoft OAuth
      window.location.href = response.authorization_url;
    } catch (err) {
      setError(err.message || 'Failed to initiate Microsoft login');
      setIsOAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <h1 className="text-[28px] font-semibold text-jobhunter-text tracking-tight">Create account</h1>
          <p className="text-[13px] text-jobhunter-textMuted mt-1">Start tracking your job applications</p>
        </div>

        <div className="bg-jobhunter-surface border border-jobhunter-border rounded-[10px] p-6">
          {error && (
            <div className="mb-4 p-4 bg-jobhunter-bg border border-jobhunter-border rounded-lg text-red-400 text-[13px]">
              {error}
            </div>
          )}

          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isOAuthLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-jobhunter-border rounded-lg hover:border-jobhunter-accent transition-colors duration-150 bg-jobhunter-surfaceAlt text-jobhunter-text font-medium text-[13px]"
            >
              {isOAuthLoading ? (
                <div className="w-4 h-4 border-2 border-jobhunter-border border-t-jobhunter-accent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={isOAuthLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-jobhunter-border rounded-lg hover:border-jobhunter-accent transition-colors duration-150 bg-jobhunter-surfaceAlt text-jobhunter-text font-medium text-[13px]"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                <path d="M0 0h10.5v10.5H0V0z" fill="#F25022"/>
                <path d="M12.5 0H23v10.5H12.5V0z" fill="#7FBA00"/>
                <path d="M0 12.5h10.5V23H0V12.5z" fill="#00A4EF"/>
                <path d="M12.5 12.5H23V23H12.5V12.5z" fill="#FFB900"/>
              </svg>
              Continue with Microsoft
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-jobhunter-border" />
            </div>
            <div className="relative flex justify-center text-[13px]">
              <span className="px-2 bg-jobhunter-surface text-jobhunter-textMuted">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jobhunter-textMuted" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input pl-10"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jobhunter-textMuted" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input pl-10"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jobhunter-textMuted" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input pl-10"
                  placeholder="Create a password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 text-[13px] font-medium"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-jobhunter-border border-t-jobhunter-accent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[13px] text-jobhunter-textMuted">
              Already have an account?{' '}
              <button type="button" onClick={onSwitchToLogin} className="text-jobhunter-accent hover:underline font-medium">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
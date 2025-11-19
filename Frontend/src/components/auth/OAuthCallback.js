import React, { useEffect, useState } from 'react';
import { userAPI } from '../../services/api';

const OAuthCallback = ({ onLogin }) => {
  const [error, setError] = useState('');

  useEffect(() => {
    // Get token and user_id from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userId = urlParams.get('user_id');

    if (token && userId) {
      // Store token
      localStorage.setItem('auth_token', token);
      
      // Fetch user profile
      userAPI.getProfile(userId)
        .then(userData => {
          // Store user data
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Call onLogin callback
          onLogin({
            id: userData.id,
            name: userData.name,
            email: userData.email
          });
          
          // Clean up URL and redirect to dashboard
          window.history.replaceState({}, document.title, '/');
        })
        .catch(err => {
          setError('Failed to load user profile');
          console.error(err);
        });
    } else {
      setError('Missing authentication token');
    }
  }, [onLogin]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="btn btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
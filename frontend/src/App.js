import React, { useState, useEffect } from 'react';
import Layout from './components/layout/layout';
import Dashboard from './pages/dashboard.js';
import Applications from './pages/applications.js';
import Profile from './pages/profile.js';
import Login from './components/auth/login.js';
import Register from './components/auth/register.js';
import OAuthCallback from './components/auth/OAuthCallback.js';
import { authAPI, applicationsAPI, userAPI } from './services/api';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for existing token on mount and handle URL params
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Check if we should navigate to profile page (from email account connection callback)
        const urlParams = new URLSearchParams(window.location.search);
        const pathname = window.location.pathname;
        if (pathname === '/profile' || urlParams.get('success') === 'email_connected' || urlParams.get('error')) {
          setCurrentPage('profile');
        }
        
        // Load applications
        if (userData.id) {
          loadApplications(userData.id);
        }
      } catch (err) {
        console.error('Failed to load saved user:', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Check if we're on OAuth callback route or email account connection callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token') && urlParams.get('user_id')) {
      setCurrentPage('oauth-callback');
    } else if (window.location.pathname === '/profile' || urlParams.get('success') === 'email_connected' || urlParams.get('error')) {
      // Redirect from email account connection callback
      if (isAuthenticated) {
        setCurrentPage('profile');
        // Clean up URL params
        window.history.replaceState({}, '', '/profile');
      }
    }
  }, [isAuthenticated]);

  const loadApplications = async (userId) => {
    setIsLoading(true);
    try {
      const userApplications = await applicationsAPI.getAll(userId);
      setApplications(userApplications);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    try {
      setUser(userData);
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Load applications for the user
      if (userData.id) {
        loadApplications(userData.id);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentPage('login');
    setApplications([]);
    setError('');
    
    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddApplication = (appData) => {
    const newApp = {
      id: Date.now(), // Temporary ID for frontend
      ...appData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setApplications(prev => [newApp, ...prev]);
  };

  const handleUpdateApplication = (id, appData) => {
    setApplications(prev => 
      prev.map(app => 
        app.id === id 
          ? { ...app, ...appData, updated_at: new Date().toISOString() }
          : app
      )
    );
  };

  const handleDeleteApplication = (id) => {
    setApplications(prev => prev.filter(app => app.id !== id));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            applications={applications} 
            user={user}
            onAddApplication={handleAddApplication}
            isLoading={isLoading}
          />
        );
      case 'applications':
        return (
          <Applications 
            applications={applications}
            user={user}
            onAddApplication={handleAddApplication}
            onUpdateApplication={handleUpdateApplication}
            onDeleteApplication={handleDeleteApplication}
          />
        );
      case 'profile':
        return <Profile user={user} />;
      case 'oauth-callback':
        return <OAuthCallback onLogin={handleLogin} />;
      default:
        return (
          <Dashboard 
            applications={applications} 
            user={user}
            onAddApplication={handleAddApplication}
            isLoading={isLoading}
          />
        );
    }
  };

  if (!isAuthenticated && currentPage !== 'oauth-callback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        {currentPage === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToRegister={() => setCurrentPage('register')} />
        ) : (
          <Register onRegister={handleLogin} onSwitchToLogin={() => setCurrentPage('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout 
        user={user}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
    </div>
  );
}

export default App;
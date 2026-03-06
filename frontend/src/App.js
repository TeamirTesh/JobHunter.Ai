import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/layout/layout';
import Dashboard from './pages/dashboard.js';
import Applications from './pages/applications.js';
import Profile from './pages/profile.js';
import Login from './components/auth/login.js';
import Register from './components/auth/register.js';
import OAuthCallback from './components/auth/OAuthCallback.js';
import { applicationsAPI } from './services/api';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);

  // Detect OAuth redirect: backend sends ?token=...&user_id=... to frontend root
  const isOAuthCallback = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('token') && params.has('user_id');
  }, []);

  // Restore session and load applications on refresh when token + user are in localStorage
  useEffect(() => {
    if (isAuthenticated || isOAuthCallback) return;
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData?.id) {
          setUser(userData);
          setIsAuthenticated(true);
          applicationsAPI.getAll(userData.id)
            .then((list) => setApplications(Array.isArray(list) ? list : []))
            .catch(() => setApplications([]));
        }
      } catch (_) {}
    }
  }, [isAuthenticated, isOAuthCallback]);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setCurrentPage('dashboard'); // Ensure we go to dashboard after login
    // Load applications from API (they're in DB e.g. Supabase)
    if (userData?.id) {
      applicationsAPI.getAll(userData.id)
        .then((list) => setApplications(Array.isArray(list) ? list : []))
        .catch(() => setApplications([]));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentPage('login');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddApplication = (appData) => {
    const newApp = {
      id: Date.now(),
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
        return <Dashboard applications={applications} onPageChange={handlePageChange} />;
      case 'applications':
        return (
          <Applications 
            applications={applications}
            onAddApplication={handleAddApplication}
            onUpdateApplication={handleUpdateApplication}
            onDeleteApplication={handleDeleteApplication}
          />
        );
      case 'profile':
        return <Profile user={user} />;
      default:
        return <Dashboard applications={applications} />;
    }
  };

  if (!isAuthenticated) {
    if (isOAuthCallback) {
      return (
        <div className="min-h-screen bg-jobhunter-bg flex items-center justify-center">
          <OAuthCallback onLogin={handleLogin} />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-jobhunter-bg flex items-center justify-center p-4">
        {currentPage === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToRegister={() => setCurrentPage('register')} />
        ) : (
          <Register onRegister={handleLogin} onSwitchToLogin={() => setCurrentPage('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jobhunter-bg">
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
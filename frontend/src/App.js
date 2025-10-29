import React, { useState, useEffect } from 'react';
import Layout from './components/layout/layout';
import Dashboard from './pages/dashboard.js';
import Applications from './pages/applications.js';
import Profile from './pages/profile.js';
import Login from './components/auth/login.js';
import Register from './components/auth/register.js';
import { authAPI, applicationsAPI } from './services/api';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (userData) => {
    try {
      // For now, we'll use the userData from the login form
      // Later we can improve this with proper JWT token handling
      setUser(userData);
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
      
      // Load applications for the user
      if (userData.id) {
        setIsLoading(true);
        try {
          const userApplications = await applicationsAPI.getAll(userData.id);
          setApplications(userApplications);
        } catch (err) {
          console.error('Failed to load applications:', err);
        } finally {
          setIsLoading(false);
        }
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

  if (!isAuthenticated) {
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
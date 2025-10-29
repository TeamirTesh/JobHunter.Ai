import React, { useState } from 'react';
import Layout from './components/layout/layout';
import Dashboard from './pages/dashboard.js';
import Applications from './pages/applications.js';
import Profile from './pages/profile.js';
import Login from './components/auth/login.js';
import Register from './components/auth/register.js';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setCurrentPage('dashboard'); // Ensure we go to dashboard after login
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
        return <Dashboard applications={applications} />;
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
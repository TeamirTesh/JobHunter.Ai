import React from 'react';
import './header.css';

const Header = ({ user, onLogout }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>JobHunter.Ai</h1>
        </div>
        
        <div className="header-actions">
          {user ? (
            <div className="user-menu">
              <span className="user-name">Welcome, {user.name || user.email}</span>
              <button onClick={onLogout} className="logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <span>Please log in</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
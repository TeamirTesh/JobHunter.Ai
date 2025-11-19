-- JobHunter Database Schema
-- This script creates the database schema for the JobHunter application
-- Supports SQLite, PostgreSQL, and MySQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    oauth_token_expires DATETIME
);

-- Email accounts table (for multiple email accounts per user)
CREATE TABLE IF NOT EXISTS email_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider VARCHAR(100) NOT NULL,
    email_address VARCHAR(120) NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_token TEXT,
    refresh_token TEXT,
    token_expires DATETIME,
    last_synced_at DATETIME,
    sync_status VARCHAR(50) DEFAULT 'idle',
    last_synced_email_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    status VARCHAR(100) DEFAULT 'Applied',
    source VARCHAR(100) DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth_id ON users(oauth_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company);


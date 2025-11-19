from datetime import datetime, timezone
from . import db

# User Model
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    oauth_provider = db.Column(db.String(50), nullable=True)  # 'google' or 'microsoft'
    oauth_id = db.Column(db.String(255))  # Their unique ID from the provider
    oauth_access_token = db.Column(db.Text)  # Encrypted access token
    oauth_refresh_token = db.Column(db.Text)  # Encrypted refresh token (for Gmail/Outlook API)
    oauth_token_expires = db.Column(db.DateTime)  # When access token expires


    # Relationships
    email_accounts = db.relationship('EmailAccount', backref='user', lazy=True)
    applications = db.relationship('Application', backref='user', lazy=True)

    def __repr__(self):
        return f"<User {self.email}>"

# Email Account Model
class EmailAccount(db.Model):
    __tablename__ = 'email_accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    provider = db.Column(db.String(100), nullable=False) # Gmail, Outlook
    email_address = db.Column(db.String(120), nullable=False)
    added_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # OAuth tokens for this specific email account (Gmail/Outlook API access)
    access_token = db.Column(db.Text)  # Encrypted/stored securely
    refresh_token = db.Column(db.Text)  # For refreshing access tokens
    token_expires = db.Column(db.DateTime)  # When access token expires

    # Sync tracking
    last_synced_at = db.Column(db.DateTime)  # Timestamp of last successful sync
    sync_status = db.Column(db.String(50), default='idle')  # 'idle', 'syncing', 'error', 'completed'
    last_synced_email_id = db.Column(db.String(255))  # Gmail message ID or Outlook item ID for incremental syncs

    def __repr__(self):
        return f"<EmailAccount {self.email_address} ({self.provider})>"

# Application Model
class Application(db.Model):
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    company = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=True)  # Job location (city, state, country, or remote)
    status = db.Column(db.String(100), default='Applied') # Applied, Interview, Offer, Rejected
    source = db.Column(db.String(100), default = 'manual') # manual, email, Linkedin, Indeed, etc
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Application {self.company} - {self.role} ({self.status})>"

    
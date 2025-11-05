from flask import Blueprint, request, jsonify, redirect, url_for, current_app
from app import db
from app.models import User, EmailAccount
from app.utils.auth import generate_jwt_token
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
import os
from datetime import datetime, timedelta, timezone
from msal import ConfidentialClientApplication


oauth_bp = Blueprint('oauth', __name__)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/auth/google/callback')

# Microsoft OAuth configuration
MICROSOFT_CLIENT_ID = os.environ.get('MICROSOFT_CLIENT_ID')
MICROSOFT_CLIENT_SECRET = os.environ.get('MICROSOFT_CLIENT_SECRET')
MICROSOFT_TENANT_ID = os.environ.get('MICROSOFT_TENANT_ID', 'common')
MICROSOFT_REDIRECT_URI = os.environ.get('MICROSOFT_REDIRECT_URI', 'http://localhost:5000/auth/microsoft/callback')

# Microsoft Graph API scopes
# Note: offline_access is automatically included by MSAL, don't add it explicitly
MICROSOFT_SCOPES = [
    'User.Read',
    'Mail.Read'
]

# Scopes needed for Gmail API access later
SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.readonly'  # For Gmail API later
]

@oauth_bp.route('/auth/google', methods=['GET'])
def google_login():
    """Initiate Google OAuth flow"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return jsonify({'error': 'Google OAuth not configured'}), 500
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI]
            }
        },
        scopes=SCOPES
    )
    
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    authorization_url, state = flow.authorization_url(
        access_type='offline',  # Get refresh token
        include_granted_scopes='true',
        prompt='consent'  # Force consent to get refresh token
    )
    
    return jsonify({
        'authorization_url': authorization_url,
        'state': state
    })

@oauth_bp.route('/auth/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback"""
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        current_app.logger.error(f"OAuth error from Google: {error}")
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/login?error={error}")
    
    if not code:
        return jsonify({'error': 'Authorization code not provided'}), 400
    
    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user info from Google
        from googleapiclient.discovery import build
        service = build('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()
        
        email = user_info.get('email')
        name = user_info.get('name', '')
        google_id = user_info.get('id')
        
        if not email:
            raise ValueError("Email not provided by Google")
        
        # Find or create user
        user = User.query.filter_by(email=email).first()
        
        # Handle expiry - it might be datetime, timestamp, or None
        expiry_datetime = None
        if credentials.expiry:
            if isinstance(credentials.expiry, datetime):
                expiry_datetime = credentials.expiry
            elif isinstance(credentials.expiry, (int, float)):
                # It's a Unix timestamp
                expiry_datetime = datetime.fromtimestamp(credentials.expiry, tz=timezone.utc)
            else:
                # Try to convert if it's a string or other type
                expiry_datetime = credentials.expiry
        
        if user:
            # Update existing user with OAuth info
            user.oauth_provider = 'google'
            user.oauth_id = google_id
            user.oauth_access_token = credentials.token
            # Only update refresh_token if we got one (might be None if user already authorized)
            if credentials.refresh_token:
                user.oauth_refresh_token = credentials.refresh_token
            if expiry_datetime:
                user.oauth_token_expires = expiry_datetime
            if not user.name:
                user.name = name
        else:
            # Create new user
            user = User(
                email=email,
                name=name,
                username=email.split('@')[0],  # Use email prefix as username
                oauth_provider='google',
                oauth_id=google_id,
                oauth_access_token=credentials.token,
                oauth_refresh_token=credentials.refresh_token,  # Might be None
                oauth_token_expires=expiry_datetime
            )
            db.session.add(user)
        
        db.session.commit()
        
        # Auto-create EmailAccount if it doesn't exist
        existing_account = EmailAccount.query.filter_by(
            user_id=user.id,
            email_address=email
        ).first()
        
        if not existing_account:
            email_account = EmailAccount(
                user_id=user.id,
                provider='Gmail',
                email_address=email,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,  # Might be None
                token_expires=expiry_datetime,
                sync_status='idle'
            )
            db.session.add(email_account)
            db.session.commit()
        
        # Generate JWT token
        jwt_token = generate_jwt_token(user.id)
        
        # Redirect to frontend with token
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}?token={jwt_token}&user_id={user.id}")
        
    except Exception as e:
        current_app.logger.error(f"Google OAuth error: {str(e)}", exc_info=True)
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/login?error=oauth_failed")

@oauth_bp.route('/auth/microsoft', methods=['GET'])
def microsoft_login():
    """Initiate Microsoft OAuth flow"""
    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        return jsonify({'error': 'Microsoft OAuth not configured'}), 500
    
    app = ConfidentialClientApplication(
        client_id=MICROSOFT_CLIENT_ID,
        client_credential=MICROSOFT_CLIENT_SECRET,
        authority=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}"
    )
    
    # Generate authorization URL
    auth_url = app.get_authorization_request_url(
        scopes=MICROSOFT_SCOPES,
        redirect_uri=MICROSOFT_REDIRECT_URI
    )
    
    return jsonify({
        'authorization_url': auth_url
    })

@oauth_bp.route('/auth/microsoft/callback', methods=['GET'])
def microsoft_callback():
    """Handle Microsoft OAuth callback"""
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        current_app.logger.error(f"OAuth error from Microsoft: {error}")
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/login?error={error}")
    
    if not code:
        return jsonify({'error': 'Authorization code not provided'}), 400
    
    try:
        app = ConfidentialClientApplication(
            client_id=MICROSOFT_CLIENT_ID,
            client_credential=MICROSOFT_CLIENT_SECRET,
            authority=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}"
        )
        
        # Exchange code for tokens
        result = app.acquire_token_by_authorization_code(
            code=code,
            scopes=MICROSOFT_SCOPES,
            redirect_uri=MICROSOFT_REDIRECT_URI
        )
        
        if 'error' in result:
            raise Exception(f"Microsoft token error: {result.get('error_description', result['error'])}")
        
        access_token = result['access_token']
        refresh_token = result.get('refresh_token')
        expires_in = result.get('expires_in', 3600)  # Default to 1 hour
        
        # Get user info from Microsoft Graph API
        import requests
        headers = {'Authorization': f'Bearer {access_token}'}
        user_response = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
        user_response.raise_for_status()
        user_info = user_response.json()
        
        # Try to get email from multiple fields
        email = user_info.get('mail') or user_info.get('userPrincipalName')
        name = user_info.get('displayName', '')
        microsoft_id = user_info.get('id')
        
        # Handle external identity emails (format: original_email#EXT#@domain.onmicrosoft.com)
        if email and '#EXT#' in email:
            # Extract the part before #EXT#
            ext_part = email.split('#EXT#')[0]
            # The original email might have underscores where @ should be
            # For example: teamirteshome1_gmail.com should be teamirteshome1@gmail.com
            # But we need to be careful - check if it looks like an email format
            if '@' not in ext_part and '_' in ext_part:
                # Try to reconstruct: find the last underscore that might be the @ replacement
                # Common pattern: username_provider.com -> username@provider.com
                parts = ext_part.rsplit('_', 1)
                if len(parts) == 2:
                    email = f"{parts[0]}@{parts[1]}"
                else:
                    # Fallback: just use the ext_part as-is
                    email = ext_part
            else:
                # If it already has @, use it as-is
                email = ext_part
        
        # Also check otherMails array for alternative emails
        if not email or '#EXT#' in email:
            other_mails = user_info.get('otherMails', [])
            if other_mails:
                email = other_mails[0]  # Use the first alternative email
        
        if not email:
            raise ValueError("Email not provided by Microsoft")
        
        # Find or create user
        user = User.query.filter_by(email=email).first()
        
        # Handle expiry
        expiry_datetime = None
        if expires_in:
            expiry_datetime = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        if user:
            # Update existing user with OAuth info
            user.oauth_provider = 'microsoft'
            user.oauth_id = microsoft_id
            user.oauth_access_token = access_token
            if refresh_token:
                user.oauth_refresh_token = refresh_token
            if expiry_datetime:
                user.oauth_token_expires = expiry_datetime
            if not user.name:
                user.name = name
        else:
            # Create new user
            user = User(
                email=email,
                name=name,
                username=email.split('@')[0],
                oauth_provider='microsoft',
                oauth_id=microsoft_id,
                oauth_access_token=access_token,
                oauth_refresh_token=refresh_token,
                oauth_token_expires=expiry_datetime
            )
            db.session.add(user)
        
        db.session.commit()
        
        # Auto-create EmailAccount if it doesn't exist
        existing_account = EmailAccount.query.filter_by(
            user_id=user.id,
            email_address=email
        ).first()
        
        if not existing_account:
            email_account = EmailAccount(
                user_id=user.id,
                provider='Outlook',
                email_address=email,
                access_token=access_token,
                refresh_token=refresh_token,  # Might be None
                token_expires=expiry_datetime,
                sync_status='idle'
            )
            db.session.add(email_account)
            db.session.commit()
        
        # Generate JWT token
        jwt_token = generate_jwt_token(user.id)
        
        # Redirect to frontend with token
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}?token={jwt_token}&user_id={user.id}")
        
    except Exception as e:
        current_app.logger.error(f"Microsoft OAuth error: {str(e)}", exc_info=True)
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/login?error=oauth_failed")
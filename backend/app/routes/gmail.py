from flask import Blueprint, request, jsonify, redirect, current_app, session
from app import db
from app.models import User, EmailAccount
from app.utils.auth import verify_jwt_token
from app.services.email_processor import process_initial_sync_for_account, process_incremental_sync_for_account
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
import requests
from datetime import datetime, timedelta, timezone
from msal import ConfidentialClientApplication
import logging

logger = logging.getLogger(__name__)

gmail_bp = Blueprint('gmail', __name__)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GMAIL_CONNECT_REDIRECT_URI = os.environ.get('GMAIL_CONNECT_REDIRECT_URI', 'http://localhost:5000/gmail/callback')

# Microsoft OAuth configuration
MICROSOFT_CLIENT_ID = os.environ.get('MICROSOFT_CLIENT_ID')
MICROSOFT_CLIENT_SECRET = os.environ.get('MICROSOFT_CLIENT_SECRET')
MICROSOFT_TENANT_ID = os.environ.get('MICROSOFT_TENANT_ID', 'common')
OUTLOOK_CONNECT_REDIRECT_URI = os.environ.get('OUTLOOK_CONNECT_REDIRECT_URI', 'http://localhost:5000/gmail/callback')

# Microsoft Graph API scopes for email access
MICROSOFT_EMAIL_SCOPES = [
    'User.Read',
    'Mail.Read'
]

# Google scopes for Gmail API access
GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.readonly'
]


def get_user_from_token():
    """Helper function to get user from JWT token in request headers"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    try:
        token = auth_header.split(' ')[1]  # Format: "Bearer <token>"
        user_id = verify_jwt_token(token)
        if not user_id:
            return None
        return User.query.get(user_id)
    except (IndexError, AttributeError):
        return None


@gmail_bp.route('/gmail/accounts', methods=['GET'])
def get_email_accounts():
    """Get all connected email accounts for the current user"""
    user = get_user_from_token()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    accounts = EmailAccount.query.filter_by(user_id=user.id).all()
    accounts_list = []
    for account in accounts:
        accounts_list.append({
            'id': account.id,
            'provider': account.provider,
            'email_address': account.email_address,
            'added_at': account.added_at.isoformat() if account.added_at else None,
            'last_synced_at': account.last_synced_at.isoformat() if account.last_synced_at else None,
            'sync_status': account.sync_status,
            'token_expires': account.token_expires.isoformat() if account.token_expires else None
        })
    
    return jsonify({'accounts': accounts_list}), 200


@gmail_bp.route('/gmail/connect', methods=['GET'])
def connect_email_account():
    """Initiate OAuth flow to connect a new email account (Gmail or Outlook)"""
    user = get_user_from_token()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    provider = request.args.get('provider', 'gmail').lower()
    
    if provider == 'gmail':
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            return jsonify({'error': 'Google OAuth not configured'}), 500
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GMAIL_CONNECT_REDIRECT_URI]
                }
            },
            scopes=GMAIL_SCOPES
        )
        
        flow.redirect_uri = GMAIL_CONNECT_REDIRECT_URI
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=f"{user.id}:gmail"  # Store user_id in state for callback
        )
        
        return jsonify({
            'authorization_url': authorization_url,
            'state': state
        })
    
    elif provider == 'outlook' or provider == 'microsoft':
        if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
            return jsonify({'error': 'Microsoft OAuth not configured'}), 500
        
        app = ConfidentialClientApplication(
            client_id=MICROSOFT_CLIENT_ID,
            client_credential=MICROSOFT_CLIENT_SECRET,
            authority=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}"
        )
        
        # Generate authorization URL with state containing user_id
        auth_url = app.get_authorization_request_url(
            scopes=MICROSOFT_EMAIL_SCOPES,
            redirect_uri=OUTLOOK_CONNECT_REDIRECT_URI,
            state=f"{user.id}:outlook"  # Store user_id in state for callback
        )
        
        return jsonify({
            'authorization_url': auth_url
        })
    
    else:
        return jsonify({'error': 'Invalid provider. Use "gmail" or "outlook"'}), 400


@gmail_bp.route('/gmail/callback', methods=['GET'])
def gmail_callback():
    """Handle OAuth callback for connecting email accounts"""
    code = request.args.get('code')
    error = request.args.get('error')
    state = request.args.get('state', '')
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    
    if error:
        logger.error(f"OAuth error during email account connection: {error}")
        return redirect(f"{frontend_url}/profile?error={error}")
    
    if not code:
        return redirect(f"{frontend_url}/profile?error=no_code")
    
    # Parse state to get user_id and provider
    try:
        user_id_str, provider = state.split(':')
        user_id = int(user_id_str)
        logger.info(f"Parsed state: user_id={user_id}, provider={provider}")
    except (ValueError, AttributeError) as e:
        logger.error(f"Invalid state parameter: {state}, error: {str(e)}")
        return redirect(f"{frontend_url}/profile?error=invalid_state")
    
    user = User.query.get(user_id)
    if not user:
        logger.error(f"User not found for user_id: {user_id}")
        return redirect(f"{frontend_url}/profile?error=user_not_found")
    
    logger.info(f"Found user: {user.id}, email: {user.email}")
    
    try:
        if provider == 'gmail':
            # Handle Google OAuth
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [GMAIL_CONNECT_REDIRECT_URI]
                    }
                },
                scopes=GMAIL_SCOPES
            )
            flow.redirect_uri = GMAIL_CONNECT_REDIRECT_URI
            
            # Exchange code for tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Get email address from Google
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            email = user_info.get('email')
            
            if not email:
                raise ValueError("Email not provided by Google")
            
            # Handle expiry
            expiry_datetime = None
            if credentials.expiry:
                if isinstance(credentials.expiry, datetime):
                    expiry_datetime = credentials.expiry
                elif isinstance(credentials.expiry, (int, float)):
                    expiry_datetime = datetime.fromtimestamp(credentials.expiry, tz=timezone.utc)
            
            # Check if account already exists
            existing_account = EmailAccount.query.filter_by(
                user_id=user.id,
                email_address=email
            ).first()
            
            if existing_account:
                # Update existing account with new tokens
                existing_account.access_token = credentials.token
                if credentials.refresh_token:
                    existing_account.refresh_token = credentials.refresh_token
                if expiry_datetime:
                    existing_account.token_expires = expiry_datetime
            else:
                # Create new email account
                email_account = EmailAccount(
                    user_id=user.id,
                    provider='Gmail',
                    email_address=email,
                    access_token=credentials.token,
                    refresh_token=credentials.refresh_token,
                    token_expires=expiry_datetime,
                    sync_status='idle'
                )
                db.session.add(email_account)
            
            db.session.commit()
            return redirect(f"{frontend_url}/profile?success=email_connected")
        
        elif provider == 'outlook':
            # Handle Microsoft OAuth
            app = ConfidentialClientApplication(
                client_id=MICROSOFT_CLIENT_ID,
                client_credential=MICROSOFT_CLIENT_SECRET,
                authority=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}"
            )
            
            # Exchange code for tokens
            result = app.acquire_token_by_authorization_code(
                code=code,
                scopes=MICROSOFT_EMAIL_SCOPES,
                redirect_uri=OUTLOOK_CONNECT_REDIRECT_URI
            )
            
            if 'error' in result:
                raise Exception(f"Microsoft token error: {result.get('error_description', result['error'])}")
            
            access_token = result['access_token']
            refresh_token = result.get('refresh_token')
            expires_in = result.get('expires_in', 3600)
            
            # Get user info from Microsoft Graph API
            headers = {'Authorization': f'Bearer {access_token}'}
            user_response = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
            user_response.raise_for_status()
            user_info = user_response.json()
            
            # Get email from Microsoft
            email = user_info.get('mail') or user_info.get('userPrincipalName')
            logger.info(f"Initial email from Microsoft: {email}")
            logger.info(f"User info keys: {user_info.keys()}")
            logger.info(f"User info: {user_info}")
            
            # Handle external identity emails
            if email and '#EXT#' in email:
                ext_part = email.split('#EXT#')[0]
                if '@' not in ext_part and '_' in ext_part:
                    parts = ext_part.rsplit('_', 1)
                    if len(parts) == 2:
                        email = f"{parts[0]}@{parts[1]}"
                    else:
                        email = ext_part
                else:
                    email = ext_part
            
            if not email or '#EXT#' in email:
                other_mails = user_info.get('otherMails', [])
                if other_mails:
                    email = other_mails[0]
            
            if not email:
                raise ValueError("Email not provided by Microsoft")
            
            logger.info(f"Final extracted email: {email}")
            logger.info(f"Processing for user_id: {user.id}")
            
            # Handle expiry
            expiry_datetime = None
            if expires_in:
                expiry_datetime = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            
            # Check if account already exists
            existing_account = EmailAccount.query.filter_by(
                user_id=user.id,
                email_address=email
            ).first()
            
            if existing_account:
                # Update existing account with new tokens
                logger.info(f"Updating existing email account {existing_account.id} for user {user.id}")
                existing_account.access_token = access_token
                if refresh_token:
                    existing_account.refresh_token = refresh_token
                if expiry_datetime:
                    existing_account.token_expires = expiry_datetime
                db.session.commit()
                logger.info(f"Successfully updated email account {existing_account.id}")
            else:
                # Create new email account
                logger.info(f"Creating new email account for user {user.id}, email: {email}")
                email_account = EmailAccount(
                    user_id=user.id,
                    provider='Outlook',
                    email_address=email,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    token_expires=expiry_datetime,
                    sync_status='idle'
                )
                db.session.add(email_account)
                try:
                    db.session.commit()
                    logger.info(f"Successfully created email account {email_account.id} for user {user.id}")
                except Exception as db_error:
                    logger.error(f"Database error creating email account: {str(db_error)}", exc_info=True)
                    db.session.rollback()
                    raise
            
            return redirect(f"{frontend_url}/profile?success=email_connected")
        
        else:
            return redirect(f"{frontend_url}/profile?error=invalid_provider")
    
    except Exception as e:
        logger.error(f"Error connecting email account: {str(e)}", exc_info=True)
        return redirect(f"{frontend_url}/profile?error=connection_failed")


@gmail_bp.route('/gmail/sync/<int:account_id>', methods=['POST'])
def sync_email_account(account_id):
    """Trigger manual sync for an email account"""
    user = get_user_from_token()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    email_account = EmailAccount.query.filter_by(id=account_id, user_id=user.id).first()
    if not email_account:
        return jsonify({'error': 'Email account not found'}), 404
    
    # Check if already syncing
    if email_account.sync_status == 'syncing':
        return jsonify({'error': 'Sync already in progress'}), 400
    
    try:
        # Update status to syncing
        email_account.sync_status = 'syncing'
        db.session.commit()
        
        # Process emails for this account
        # Check if this is initial sync (no last_synced_at) or incremental
        if email_account.last_synced_at is None:
            # Initial sync - process last 500 emails
            results = process_initial_sync_for_account(email_account, max_emails=500)
        else:
            # Incremental sync - process emails since last_synced_at
            results = process_incremental_sync_for_account(email_account)
        
        # Status is updated by the processor function
        
        return jsonify({
            'message': 'Sync started',
            'status': 'syncing'
        }), 200
    
    except Exception as e:
        logger.error(f"Error syncing email account {account_id}: {str(e)}", exc_info=True)
        email_account.sync_status = 'error'
        db.session.commit()
        return jsonify({'error': 'Sync failed'}), 500


@gmail_bp.route('/gmail/status/<int:account_id>', methods=['GET'])
def get_sync_status(account_id):
    """Get sync status for an email account"""
    user = get_user_from_token()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    email_account = EmailAccount.query.filter_by(id=account_id, user_id=user.id).first()
    if not email_account:
        return jsonify({'error': 'Email account not found'}), 404
    
    return jsonify({
        'id': email_account.id,
        'email_address': email_account.email_address,
        'provider': email_account.provider,
        'sync_status': email_account.sync_status,
        'last_synced_at': email_account.last_synced_at.isoformat() if email_account.last_synced_at else None,
        'token_expires': email_account.token_expires.isoformat() if email_account.token_expires else None
    }), 200


@gmail_bp.route('/gmail/accounts/<int:account_id>', methods=['DELETE'])
def disconnect_email_account(account_id):
    """Disconnect an email account"""
    user = get_user_from_token()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    email_account = EmailAccount.query.filter_by(id=account_id, user_id=user.id).first()
    if not email_account:
        return jsonify({'error': 'Email account not found'}), 404
    
    try:
        db.session.delete(email_account)
        db.session.commit()
        return jsonify({'message': 'Email account disconnected successfully'}), 200
    except Exception as e:
        logger.error(f"Error disconnecting email account {account_id}: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Failed to disconnect account'}), 500


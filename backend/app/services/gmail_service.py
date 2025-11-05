from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from app.models import User, EmailAccount
from app import db
from datetime import datetime, timezone, timedelta
import os
import logging

logger = logging.getLogger(__name__)

# Gmail API scopes (should match what we requested in OAuth)
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


def get_gmail_credentials(user):
    """
    Get valid Gmail API credentials for a user.
    Refreshes token if expired.
    Returns Credentials object or None if invalid.
    """
    if user.oauth_provider != 'google':
        return None
    
    if not user.oauth_refresh_token:
        logger.error(f"User {user.id} has no refresh token")
        return None
    
    # Create credentials object
    creds = Credentials(
        token=user.oauth_access_token,
        refresh_token=user.oauth_refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.environ.get('GOOGLE_CLIENT_ID'),
        client_secret=os.environ.get('GOOGLE_CLIENT_SECRET')
    )
    
    # Check if token is expired or about to expire (within 5 minutes)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                # Refresh the token
                creds.refresh(Request())
                
                # Update user's tokens in database
                user.oauth_access_token = creds.token
                if creds.expiry:
                    user.oauth_token_expires = creds.expiry
                db.session.commit()
                
                logger.info(f"Refreshed token for user {user.id}")
            except Exception as e:
                logger.error(f"Failed to refresh token for user {user.id}: {str(e)}")
                return None
    
    return creds


def get_gmail_service(user):
    """
    Get Gmail API service object for a user.
    Returns service object or None if credentials are invalid.
    """
    creds = get_gmail_credentials(user)
    if not creds:
        return None
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        logger.error(f"Failed to build Gmail service for user {user.id}: {str(e)}")
        return None


def fetch_emails(user, max_results=500, query=None):
    """
    Fetch emails from user's Gmail account.
    
    Args:
        user: User model instance
        max_results: Maximum number of emails to fetch (default 500)
        query: Gmail search query (e.g., 'from:recruiter@company.com')
    
    Returns:
        List of email messages or empty list on error
    """
    service = get_gmail_service(user)
    if not service:
        return []
    
    try:
        # Build search query
        search_query = query if query else ''
        
        # List messages
        results = service.users().messages().list(
            userId='me',
            maxResults=max_results,
            q=search_query
        ).execute()
        
        messages = results.get('messages', [])
        
        if not messages:
            logger.info(f"No messages found for user {user.id}")
            return []
        
        # Fetch full message details
        email_list = []
        for msg in messages:
            try:
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                
                email_list.append(message)
            except HttpError as e:
                logger.error(f"Error fetching message {msg['id']}: {str(e)}")
                continue
        
        logger.info(f"Fetched {len(email_list)} emails for user {user.id}")
        return email_list
    
    except HttpError as e:
        logger.error(f"Gmail API error for user {user.id}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error fetching emails for user {user.id}: {str(e)}")
        return []


def parse_email_message(message):
    """
    Parse Gmail API message object into a simpler dictionary.
    
    Args:
        message: Gmail API message object
    
    Returns:
        Dictionary with email data: {
            'id': message_id,
            'subject': subject,
            'from': sender,
            'to': recipient,
            'date': date,
            'body': email_body,
            'snippet': snippet
        }
    """
    headers = message['payload'].get('headers', [])
    
    # Extract headers
    subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
    sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
    recipient = next((h['value'] for h in headers if h['name'] == 'To'), '')
    date_str = next((h['value'] for h in headers if h['name'] == 'Date'), '')
    
    # Extract body
    body = ''
    payload = message['payload']
    
    if 'parts' in payload:
        # Multipart message
        for part in payload['parts']:
            if part['mimeType'] == 'text/plain':
                if 'data' in part['body']:
                    import base64
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                    break
            elif part['mimeType'] == 'text/html':
                if 'data' in part['body']:
                    import base64
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                    break
    else:
        # Simple message
        if payload.get('body', {}).get('data'):
            import base64
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
    
    return {
        'id': message['id'],
        'subject': subject,
        'from': sender,
        'to': recipient,
        'date': date_str,
        'body': body,
        'snippet': message.get('snippet', '')
    }


def fetch_recent_emails(user, since_date=None):
    """
    Fetch emails since a specific date.
    
    Args:
        user: User model instance
        since_date: datetime object - only fetch emails after this date
    
    Returns:
        List of parsed email dictionaries
    """
    query = None
    if since_date:
        # Gmail query format: after:YYYY/MM/DD
        query = f"after:{since_date.strftime('%Y/%m/%d')}"
    
    messages = fetch_emails(user, max_results=500, query=query)
    parsed_emails = []
    
    for msg in messages:
        try:
            parsed = parse_email_message(msg)
            parsed_emails.append(parsed)
        except Exception as e:
            logger.error(f"Error parsing email {msg.get('id', 'unknown')}: {str(e)}")
            continue
    
    return parsed_emails


# ============================================================================
# EmailAccount-based functions (for multiple email accounts per user)
# ============================================================================

def get_gmail_credentials_for_account(email_account):
    """
    Get valid Gmail API credentials for an EmailAccount.
    Refreshes token if expired.
    Returns Credentials object or None if invalid.
    """
    if email_account.provider != 'Gmail':
        return None
    
    if not email_account.refresh_token:
        logger.error(f"EmailAccount {email_account.id} has no refresh token")
        return None
    
    # Create credentials object
    creds = Credentials(
        token=email_account.access_token,
        refresh_token=email_account.refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.environ.get('GOOGLE_CLIENT_ID'),
        client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
        expiry=email_account.token_expires
    )
    
    # Check if token is expired or about to expire (within 5 minutes)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                # Refresh the token
                creds.refresh(Request())
                
                # Update account's tokens in database
                email_account.access_token = creds.token
                if creds.expiry:
                    email_account.token_expires = creds.expiry
                db.session.commit()
                
                logger.info(f"Refreshed token for EmailAccount {email_account.id}")
            except Exception as e:
                logger.error(f"Failed to refresh token for EmailAccount {email_account.id}: {str(e)}")
                return None
    
    return creds


def get_gmail_service_for_account(email_account):
    """
    Get Gmail API service object for an EmailAccount.
    Returns service object or None if credentials are invalid.
    """
    creds = get_gmail_credentials_for_account(email_account)
    if not creds:
        return None
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        logger.error(f"Failed to build Gmail service for EmailAccount {email_account.id}: {str(e)}")
        return None


def fetch_emails_for_account(email_account, max_results=500, query=None, since_email_id=None):
    """
    Fetch emails from an EmailAccount's Gmail account.
    
    Args:
        email_account: EmailAccount model instance
        max_results: Maximum number of emails to fetch (default 500)
        query: Gmail search query (e.g., 'from:recruiter@company.com')
        since_email_id: Only fetch emails after this message ID (for incremental sync)
    
    Returns:
        List of email messages or empty list on error
    """
    if email_account.provider != 'Gmail':
        logger.error(f"EmailAccount {email_account.id} is not a Gmail account")
        return []
    
    service = get_gmail_service_for_account(email_account)
    if not service:
        return []
    
    try:
        # Build search query
        search_query = query if query else ''
        
        # If we have a last synced email ID, we can use it for incremental sync
        # However, Gmail API doesn't directly support "after message ID", so we'll use date-based queries
        # This is handled in fetch_recent_emails_for_account
        
        # List messages
        results = service.users().messages().list(
            userId='me',
            maxResults=max_results,
            q=search_query
        ).execute()
        
        messages = results.get('messages', [])
        
        if not messages:
            logger.info(f"No messages found for EmailAccount {email_account.id}")
            return []
        
        # Fetch full message details
        email_list = []
        for msg in messages:
            try:
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                
                email_list.append(message)
            except HttpError as e:
                logger.error(f"Error fetching message {msg['id']}: {str(e)}")
                continue
        
        logger.info(f"Fetched {len(email_list)} emails for EmailAccount {email_account.id}")
        return email_list
    
    except HttpError as e:
        logger.error(f"Gmail API error for EmailAccount {email_account.id}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error fetching emails for EmailAccount {email_account.id}: {str(e)}")
        return []


def fetch_recent_emails_for_account(email_account, max_emails=500):
    """
    Fetch emails for an EmailAccount, using last_synced_at for incremental syncs.
    
    Args:
        email_account: EmailAccount model instance
        max_emails: Maximum number of emails to fetch (default 500)
    
    Returns:
        List of parsed email dictionaries
    """
    if email_account.provider != 'Gmail':
        logger.error(f"EmailAccount {email_account.id} is not a Gmail account")
        return []
    
    query = None
    # Use last_synced_at for incremental syncs
    if email_account.last_synced_at:
        # Gmail query format: after:YYYY/MM/DD
        query = f"after:{email_account.last_synced_at.strftime('%Y/%m/%d')}"
    
    messages = fetch_emails_for_account(email_account, max_results=max_emails, query=query)
    parsed_emails = []
    
    for msg in messages:
        try:
            parsed = parse_email_message(msg)
            parsed_emails.append(parsed)
        except Exception as e:
            logger.error(f"Error parsing email {msg.get('id', 'unknown')}: {str(e)}")
            continue
    
    return parsed_emails
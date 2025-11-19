import logging
import os
from datetime import datetime, timezone, timedelta

import requests
from msal import ConfidentialClientApplication

from app import db

logger = logging.getLogger(__name__)

MICROSOFT_CLIENT_ID = os.environ.get('MICROSOFT_CLIENT_ID')
MICROSOFT_CLIENT_SECRET = os.environ.get('MICROSOFT_CLIENT_SECRET')
MICROSOFT_TENANT_ID = os.environ.get('MICROSOFT_TENANT_ID', 'common')

MICROSOFT_SCOPES = [
    'User.Read',
    'Mail.Read'
]

GRAPH_API_BASE_URL = 'https://graph.microsoft.com/v1.0'
TOKEN_REFRESH_BUFFER_SECONDS = 300


def _get_confidential_client():
    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        logger.error("Microsoft OAuth client ID/secret not configured")
        return None

    try:
        return ConfidentialClientApplication(
            client_id=MICROSOFT_CLIENT_ID,
            client_credential=MICROSOFT_CLIENT_SECRET,
            authority=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}"
        )
    except Exception as exc:
        logger.error(f"Failed to create MSAL confidential client: {exc}")
        return None


def _ensure_outlook_access_token(email_account):
    """
    Ensure we have a valid access token for the Outlook account.
    Refresh using the stored refresh_token if necessary.
    """
    if email_account.provider != 'Outlook':
        logger.error(f"EmailAccount {email_account.id} is not an Outlook account")
        return None

    now = datetime.now(timezone.utc)
    token_expires = email_account.token_expires
    if token_expires and token_expires.tzinfo is None:
        token_expires = token_expires.replace(tzinfo=timezone.utc)

    needs_refresh = False
    if not email_account.access_token:
        needs_refresh = True
    elif token_expires and token_expires - timedelta(seconds=TOKEN_REFRESH_BUFFER_SECONDS) <= now:
        needs_refresh = True

    if not needs_refresh:
        return email_account.access_token

    if not email_account.refresh_token:
        logger.error(f"EmailAccount {email_account.id} missing refresh token for Outlook")
        return None

    client = _get_confidential_client()
    if not client:
        return None

    try:
        result = client.acquire_token_by_refresh_token(
            refresh_token=email_account.refresh_token,
            scopes=["https://graph.microsoft.com/.default"]
        )
    except Exception as exc:
        logger.error(f"MSAL refresh failed for EmailAccount {email_account.id}: {exc}")
        return None

    if not result or 'access_token' not in result:
        logger.error(f"MSAL token refresh failed: {result}")
        return None


    try:
        email_account.access_token = result['access_token']
        expires_in = result.get('expires_in', 3600)
        email_account.token_expires = now + timedelta(seconds=expires_in)
        if 'refresh_token' in result and result['refresh_token']:
            email_account.refresh_token = result['refresh_token']
        db.session.commit()
    except Exception as exc:
        logger.error(f"Failed to persist refreshed Outlook tokens for EmailAccount {email_account.id}: {exc}")
        db.session.rollback()
        return None

    return email_account.access_token


def _parse_outlook_message(message):
    sender = message.get('from', {}) or {}
    sender_email = sender.get('emailAddress', {}).get('address', '')

    to_recipients = message.get('toRecipients', []) or []
    to_addresses = [
        recipient.get('emailAddress', {}).get('address', '')
        for recipient in to_recipients
    ]
    to_address = ', '.join(filter(None, to_addresses))

    return {
        'id': message.get('id'),
        'subject': message.get('subject', ''),
        'from': sender_email,
        'to': to_address,
        'date': message.get('receivedDateTime'),
        'body': message.get('body', {}).get('content', ''),
        'snippet': message.get('bodyPreview', '')
    }


def _fetch_outlook_messages(email_account, max_emails=500, since_datetime=None):
    access_token = _ensure_outlook_access_token(email_account)
    if not access_token:
        return []

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json',
        'Prefer': 'outlook.body-content-type="text"'
    }

    page_size = max(1, min(max_emails, 100))
    params = {
        '$top': page_size,
        '$orderby': 'receivedDateTime desc',
        '$select': 'id,subject,from,toRecipients,receivedDateTime,bodyPreview,body'
    }

    if since_datetime:
        since_iso = since_datetime.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        params['$filter'] = f"receivedDateTime ge {since_iso}"

    messages = []
    url = f"{GRAPH_API_BASE_URL}/me/messages"

    try:
        while url and len(messages) < max_emails:
            response = requests.get(url, headers=headers, params=params, timeout=15)
            if response.status_code == 401:
                # Attempt one token refresh if unauthorized
                logger.warning(
                    f"Access token expired for EmailAccount {email_account.id}, refreshing..."
                )
                logger.debug(
                    "Outlook 401 response body before refresh: %s",
                    response.text
                )
                access_token = _ensure_outlook_access_token(email_account)
                if not access_token:
                    return messages
                headers['Authorization'] = f'Bearer {access_token}'
                response = requests.get(url, headers=headers, params=params, timeout=15)

            if response.status_code >= 400:
                logger.error(
                    "Failed to fetch Outlook messages for EmailAccount %s: %s - %s",
                    email_account.id,
                    response.status_code,
                    response.text
                )
                response.raise_for_status()

            data = response.json()

            batch = data.get('value', [])
            for item in batch:
                messages.append(item)
                if len(messages) >= max_emails:
                    break

            # Use nextLink for pagination
            url = data.get('@odata.nextLink')
            params = None  # Params already encoded in nextLink

            if not url:
                break
    except requests.exceptions.RequestException as exc:
        logger.error(f"Error fetching Outlook messages for EmailAccount {email_account.id}: {exc}")
        return []

    return messages


def fetch_recent_emails_for_account(email_account, max_emails=500):
    """
    Fetch and parse Outlook emails for the provided EmailAccount.
    """
    raw_messages = _fetch_outlook_messages(
        email_account,
        max_emails=max_emails,
        since_datetime=(
            email_account.last_synced_at.replace(tzinfo=timezone.utc)
            if email_account.last_synced_at and email_account.last_synced_at.tzinfo is None
            else email_account.last_synced_at
        )
    )

    parsed_emails = []
    for message in raw_messages:
        try:
            parsed_emails.append(_parse_outlook_message(message))
        except Exception as exc:
            logger.error(f"Failed to parse Outlook message for EmailAccount {email_account.id}: {exc}")
            continue

    return parsed_emails


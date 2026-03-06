from app.models import User, Application, EmailAccount
from app import db
from app.services.gmail_service import (
    fetch_recent_emails,
    fetch_recent_emails_for_account as fetch_recent_gmail_emails_for_account
)
from app.services.outlook_service import fetch_recent_emails_for_account as fetch_recent_outlook_emails_for_account
from app.services.openai_service import analyze_multiple_emails
from datetime import datetime, timezone
import re
import logging

logger = logging.getLogger(__name__)

# Suffixes to strip when matching company names (so "Wells Fargo Bank" matches "Wells Fargo")
_COMPANY_NORMALIZE_SUFFIXES = (
    ' inc', ' inc.', ' llc', ' l.l.c.', ' corp', ' corp.', ' corporation',
    ' & co', ' & co.', ' and co', ' co.', ' company', ' bank', ' banks',
    ' university', ' u.', ' institute', ' tech', ' technologies', ' group',
)


def map_status_to_application_status(openai_status):
    """
    Map OpenAI extracted status to Application model status.
    
    Args:
        openai_status: Status from OpenAI ('applied', 'interview', 'offer', 'rejected', 'other')
    
    Returns:
        Application status string: 'Applied', 'Interview', 'Offer', 'Rejected', 'Applied'
    """
    status_mapping = {
        'applied': 'Applied',
        'interview': 'Interview',
        'offer': 'Offer',
        'rejected': 'Rejected',
        'other': 'Applied'  # Default to Applied for other job-related emails
    }
    return status_mapping.get(openai_status.lower(), 'Applied')


def _normalize_company(s):
    """Normalize company name for matching: lowercase, strip suffixes, collapse spaces."""
    if not s or not isinstance(s, str):
        return ''
    t = s.strip().lower()
    t = re.sub(r'[^\w\s&]', '', t)  # remove punctuation except &
    t = re.sub(r'\s+', ' ', t).strip()
    for suffix in _COMPANY_NORMALIZE_SUFFIXES:
        if t.endswith(suffix):
            t = t[:-len(suffix)].strip()
    return t or s.strip().lower()


def _normalize_role(s):
    """Normalize job role/title for matching: lowercase, collapse spaces, strip common suffixes."""
    if not s or not isinstance(s, str):
        return ''
    t = s.strip().lower()
    t = re.sub(r'[^\w\s]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    # Optional: strip level suffixes so "Software Engineer I" matches "Software Engineer"
    for suffix in (' i', ' ii', ' iii', ' iv', ' sr', ' jr', ' sr.', ' jr.'):
        if t.endswith(suffix):
            t = t[:-len(suffix)].strip()
    return t


# Personal email domains we don't use as company_domain (would show wrong logo)
_PERSONAL_EMAIL_DOMAINS = frozenset((
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com',
    'hotmail.com', 'hotmail.co.uk', 'live.com', 'icloud.com', 'me.com', 'aol.com',
    'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'gmx.com'
))


def _domain_from_from_header(email_data):
    """
    Extract company domain from the 'From' header for Clearbit logo.
    E.g. "Wells Fargo Careers <careers@wellsfargo.com>" -> "wellsfargo.com"
    Returns None if From is missing or is a personal email domain.
    """
    from_addr = (email_data.get('from') or '').strip()
    if not from_addr or '@' not in from_addr:
        return None
    # Handle "Name <email@domain.com>" or "email@domain.com"
    if '<' in from_addr and '>' in from_addr:
        from_addr = from_addr.split('<')[-1].split('>')[0].strip()
    domain = from_addr.split('@')[-1].lower().strip()
    if not domain or domain in _PERSONAL_EMAIL_DOMAINS:
        return None
    return domain


def _fallback_company_from_email(email_data):
    """
    Derive a plausible company name from the 'From' field when GPT didn't return one.
    E.g. "Wells Fargo Careers <careers@wellsfargo.com>" -> "Wells Fargo"
         "noreply@company.com" -> "Company"
    """
    from_addr = (email_data.get('from') or '').strip()
    if not from_addr:
        return None
    # Try "Display Name <email@domain.com>" -> use display name if it looks like a company
    if '<' in from_addr and '>' in from_addr:
        name_part = from_addr.split('<')[0].strip().strip('"')
        if name_part and not name_part.startswith('http'):
            # "Wells Fargo Careers" -> "Wells Fargo"; "noreply" -> skip to domain
            for drop in (' Careers', ' Recruiting', ' Talent', ' HR', ' Hiring', ' Recruitment', ' -', ' noreply', ' no-reply'):
                if drop.lower() in name_part.lower():
                    name_part = name_part.split(drop)[0].strip() or name_part
            if len(name_part) > 2:
                return name_part
    # Fallback: domain part of email
    if '@' in from_addr:
        domain = from_addr.split('@')[-1].lower()
        if domain.endswith('.com'):
            domain = domain[:-4]
        elif domain.endswith('.org') or domain.endswith('.edu'):
            domain = domain[:-4]
        # wellsfargo.com -> Wells Fargo
        if '.' in domain:
            domain = domain.split('.')[0]
        if domain and domain not in ('gmail', 'yahoo', 'outlook', 'hotmail', 'live', 'icloud'):
            return domain.replace('-', ' ').title()
    return None


def find_existing_application(user_id, company, role):
    """
    Check if an application already exists for this user with the same company and role.
    Uses normalized matching so "JPMorgan Chase & Co." matches "JPMorgan Chase", and
    "Software Engineer I" matches "Software Engineer", reducing duplicates from multiple emails.
    
    Args:
        user_id: User ID
        company: Company name (or None)
        role: Job role/position (or None)
    
    Returns:
        Application object if found, None otherwise
    """
    if not company or not role:
        return None
    
    company_norm = _normalize_company(company)
    role_norm = _normalize_role(role)
    
    existing = Application.query.filter_by(user_id=user_id).all()
    
    for app in existing:
        app_company_norm = _normalize_company(app.company) if app.company else ''
        app_role_norm = _normalize_role(app.role) if app.role else ''
        if app_company_norm == company_norm and app_role_norm == role_norm:
            return app
    
    return None


def create_application_from_email(user_id, email_data, analysis):
    """
    Create an Application record from email analysis.
    
    Args:
        user_id: User ID
        email_data: Email dictionary from Gmail service
        analysis: Analysis dictionary from OpenAI service
    
    Returns:
        Application object if created, None if skipped
    """
    company = (analysis.get('company') or '').strip() or None
    role = (analysis.get('role') or '').strip() or None
    location = analysis.get('location')
    status = analysis.get('status', 'other')
    domain = _domain_from_from_header(email_data)
    
    # Optional fallback: infer company from From address when possible (app still works if null)
    if not company:
        company = _fallback_company_from_email(email_data)
    
    # Check if application already exists (skip match when company or role is null)
    existing = find_existing_application(user_id, company, role)
    
    if existing:
        # Same company+role already in DB: do not create a duplicate.
        # Only update when this email indicates a meaningful status change
        # (e.g. interview invite, offer, rejection). Ignore extra "thank you for applying" emails.
        status_priority = {'Applied': 1, 'Interview': 2, 'Offer': 3, 'Rejected': 4}
        new_status = map_status_to_application_status(status)
        current_priority = status_priority.get(existing.status, 0)
        new_priority = status_priority.get(new_status, 0)
        
        updated = False
        # Fill in missing company/role/company_domain on existing row if this email has them
        if company and not (existing.company or '').strip():
            existing.company = company.strip()
            updated = True
        if role and not (existing.role or '').strip():
            existing.role = role.strip()
            updated = True
        if domain and not (existing.company_domain or '').strip():
            existing.company_domain = domain
            updated = True
        # Meaningful status change: rejection or progression (Applied -> Interview -> Offer)
        if new_status == 'Rejected' or (new_priority > current_priority and new_status != 'Rejected'):
            existing.status = new_status
            if location:
                existing.location = location.strip()
            existing.updated_at = datetime.now(timezone.utc)
            existing.source = 'email'
            updated = True
        elif location and not (existing.location or '').strip():
            existing.location = location.strip()
            existing.updated_at = datetime.now(timezone.utc)
            updated = True
        if updated:
            db.session.commit()
            logger.info(f"Updated existing application: {existing.company or 'Unknown'} - {existing.role or 'Unknown'} (status={existing.status})")
        else:
            logger.debug(f"Existing application unchanged (no meaningful update): {company or 'Unknown'} - {role or 'Unknown'}")
        return existing
    
    # Create new application (company/role/company_domain may be None)
    application_status = map_status_to_application_status(status)
    
    new_application = Application(
        user_id=user_id,
        company=company.strip() if company else None,
        role=role.strip() if role else None,
        company_domain=domain,
        location=location.strip() if location else None,
        status=application_status,
        source='email',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    db.session.add(new_application)
    db.session.commit()
    
    logger.info(f"Created new application: {company or 'Unknown'} - {role or 'Unknown'} with status {application_status}")
    return new_application


def process_emails_for_user(user, max_emails=500, since_date=None):
    """
    Main function to process emails for a user:
    1. Fetch emails from Gmail
    2. Analyze with OpenAI
    3. Create Application records
    
    Args:
        user: User model instance
        max_emails: Maximum number of emails to process (default 500 for initial sync)
        since_date: datetime object - only process emails after this date (for incremental sync)
    
    Returns:
        Dictionary with processing results:
        {
            'total_emails': int,
            'job_related_emails': int,
            'applications_created': int,
            'applications_updated': int,
            'errors': int,
            'applications': list of created/updated Application objects
        }
    """
    
    if user.oauth_provider != 'google':
        logger.error(f"User {user.id} is not a Google user")
        return {
            'total_emails': 0,
            'job_related_emails': 0,
            'applications_created': 0,
            'applications_updated': 0,
            'errors': 0,
            'applications': []
        }
    
    logger.info(f"Starting email processing for user {user.id} ({user.email})")
    
    results = {
        'total_emails': 0,
        'job_related_emails': 0,
        'applications_created': 0,
        'applications_updated': 0,
        'errors': 0,
        'applications': []
    }
    
    try:
        # Step 1: Fetch emails from Gmail
        logger.info(f"Fetching emails for user {user.id}...")
        emails = fetch_recent_emails(user, since_date=since_date)
        results['total_emails'] = len(emails)
        
        if not emails:
            logger.info(f"No emails found for user {user.id}")
            return results
        
        logger.info(f"Fetched {len(emails)} emails, analyzing with OpenAI...")
        
        # Step 2: Analyze emails with OpenAI
        job_related_emails = analyze_multiple_emails(emails)
        results['job_related_emails'] = len(job_related_emails)
        
        if not job_related_emails:
            logger.info(f"No job-related emails found for user {user.id}")
            return results
        
        logger.info(f"Found {len(job_related_emails)} job-related emails, creating applications...")
        
        # Step 3: Create Application records
        for item in job_related_emails:
            email_data = item['email']
            analysis = item['analysis']
            
            try:
                # Check if we should create/update application
                existing = find_existing_application(
                    user.id,
                    analysis.get('company'),
                    analysis.get('role')
                )
                
                was_existing = existing is not None
                
                application = create_application_from_email(user.id, email_data, analysis)
                
                if application:
                    results['applications'].append(application)
                    if was_existing:
                        results['applications_updated'] += 1
                    else:
                        results['applications_created'] += 1
                
            except Exception as e:
                logger.error(f"Error processing email {email_data.get('id', 'unknown')}: {str(e)}")
                results['errors'] += 1
                continue
        
        logger.info(
            f"Email processing complete for user {user.id}: "
            f"{results['applications_created']} created, "
            f"{results['applications_updated']} updated, "
            f"{results['errors']} errors"
        )
        
        return results
    
    except Exception as e:
        logger.error(f"Error processing emails for user {user.id}: {str(e)}")
        results['errors'] = 1
        return results


def process_initial_sync(user, max_emails=500):
    """
    Process initial email sync (last 500 emails).
    
    Args:
        user: User model instance
        max_emails: Maximum emails to process (default 500)
    
    Returns:
        Processing results dictionary
    """
    return process_emails_for_user(user, max_emails=max_emails, since_date=None)


def process_incremental_sync(user, since_date):
    """
    Process incremental email sync (emails since a specific date).
    
    Args:
        user: User model instance
        since_date: datetime object - only process emails after this date
    
    Returns:
        Processing results dictionary
    """
    return process_emails_for_user(user, max_emails=500, since_date=since_date)


# ============================================================================
# EmailAccount-based functions (for multiple email accounts per user)
# ============================================================================

def process_emails_for_account(email_account, max_emails=500):
    """
    Main function to process emails for an EmailAccount:
    1. Fetch emails from Gmail/Outlook
    2. Analyze with OpenAI
    3. Create Application records
    4. Update EmailAccount sync status and timestamps
    
    Args:
        email_account: EmailAccount model instance
        max_emails: Maximum number of emails to process (default 500 for initial sync)
    
    Returns:
        Dictionary with processing results:
        {
            'total_emails': int,
            'job_related_emails': int,
            'applications_created': int,
            'applications_updated': int,
            'errors': int,
            'applications': list of created/updated Application objects
        }
    """
    
    supported_providers = ['Gmail', 'Outlook']
    if email_account.provider not in supported_providers:
        logger.error(
            f"EmailAccount {email_account.id} has unsupported provider: {email_account.provider}"
        )
        return {
            'total_emails': 0,
            'job_related_emails': 0,
            'applications_created': 0,
            'applications_updated': 0,
            'errors': 0,
            'applications': []
        }
    
    logger.info(f"Starting email processing for EmailAccount {email_account.id} ({email_account.email_address})")
    
    results = {
        'total_emails': 0,
        'job_related_emails': 0,
        'applications_created': 0,
        'applications_updated': 0,
        'errors': 0,
        'applications': []
    }
    
    try:
        # Step 1: Fetch emails from Gmail
        logger.info(f"Fetching emails for EmailAccount {email_account.id}...")
        if email_account.provider == 'Gmail':
            emails = fetch_recent_gmail_emails_for_account(
                email_account,
                max_emails=max_emails
            )
        else:
            emails = fetch_recent_outlook_emails_for_account(
                email_account,
                max_emails=max_emails
            )
        results['total_emails'] = len(emails)
        
        if not emails:
            logger.info(f"No emails found for EmailAccount {email_account.id}")
            # Update sync status even if no emails
            email_account.sync_status = 'completed'
            email_account.last_synced_at = datetime.now(timezone.utc)
            db.session.commit()
            return results
        
        logger.info(f"Fetched {len(emails)} emails, analyzing with OpenAI...")
        
        # Step 2: Analyze emails with OpenAI
        job_related_emails = analyze_multiple_emails(emails)
        results['job_related_emails'] = len(job_related_emails)
        
        if not job_related_emails:
            logger.info(f"No job-related emails found for EmailAccount {email_account.id}")
            # Update sync status even if no job-related emails
            email_account.sync_status = 'completed'
            email_account.last_synced_at = datetime.now(timezone.utc)
            # Update last_synced_email_id to the most recent email
            if emails:
                email_account.last_synced_email_id = emails[0].get('id')
            db.session.commit()
            return results
        
        logger.info(f"Found {len(job_related_emails)} job-related emails, creating applications...")
        
        # Step 3: Create Application records
        last_processed_email_id = None
        for item in job_related_emails:
            email_data = item['email']
            analysis = item['analysis']
            
            # Track the most recent email ID processed
            if not last_processed_email_id or email_data.get('id'):
                last_processed_email_id = email_data.get('id')
            
            try:
                # Check if we should create/update application
                existing = find_existing_application(
                    email_account.user_id,
                    analysis.get('company'),
                    analysis.get('role')
                )
                
                was_existing = existing is not None
                
                application = create_application_from_email(email_account.user_id, email_data, analysis)
                
                if application:
                    results['applications'].append(application)
                    if was_existing:
                        results['applications_updated'] += 1
                    else:
                        results['applications_created'] += 1
                
            except Exception as e:
                logger.error(f"Error processing email {email_data.get('id', 'unknown')}: {str(e)}")
                results['errors'] += 1
                continue
        
        # Step 4: Update EmailAccount sync status and timestamps
        email_account.sync_status = 'completed'
        email_account.last_synced_at = datetime.now(timezone.utc)
        if last_processed_email_id:
            email_account.last_synced_email_id = last_processed_email_id
        db.session.commit()
        
        logger.info(
            f"Email processing complete for EmailAccount {email_account.id}: "
            f"{results['applications_created']} created, "
            f"{results['applications_updated']} updated, "
            f"{results['errors']} errors"
        )
        
        return results
    
    except Exception as e:
        logger.error(f"Error processing emails for EmailAccount {email_account.id}: {str(e)}", exc_info=True)
        email_account.sync_status = 'error'
        db.session.commit()
        results['errors'] = 1
        return results


def process_initial_sync_for_account(email_account, max_emails=500):
    """
    Process initial email sync for an EmailAccount (last 500 emails).
    
    Args:
        email_account: EmailAccount model instance
        max_emails: Maximum emails to process (default 500)
    
    Returns:
        Processing results dictionary
    """
    return process_emails_for_account(email_account, max_emails=max_emails)


def process_incremental_sync_for_account(email_account):
    """
    Process incremental email sync for an EmailAccount (emails since last_synced_at).
    
    Args:
        email_account: EmailAccount model instance
    
    Returns:
        Processing results dictionary
    """
    return process_emails_for_account(email_account, max_emails=500)
from app.models import User, Application, EmailAccount
from app import db
from app.services.gmail_service import fetch_recent_emails, fetch_recent_emails_for_account
from app.services.openai_service import analyze_multiple_emails
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


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


def find_existing_application(user_id, company, role):
    """
    Check if an application already exists for this user, company, and role.
    
    Args:
        user_id: User ID
        company: Company name
        role: Job role/position
    
    Returns:
        Application object if found, None otherwise
    """
    if not company or not role:
        return None
    
    # Normalize for comparison (case-insensitive, strip whitespace)
    company_normalized = company.strip().lower()
    role_normalized = role.strip().lower()
    
    existing = Application.query.filter_by(user_id=user_id).all()
    
    for app in existing:
        if app.company.strip().lower() == company_normalized and \
           app.role.strip().lower() == role_normalized:
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
    company = analysis.get('company')
    role = analysis.get('role')
    location = analysis.get('location')
    status = analysis.get('status', 'other')
    
    # Need at least company and role to create application
    if not company or not role:
        logger.warning(f"Missing company or role in analysis. Company: {company}, Role: {role}")
        return None
    
    # Check if application already exists
    existing = find_existing_application(user_id, company, role)
    
    if existing:
        # Update existing application status if it's more advanced
        # e.g., if existing is 'Applied' and new is 'Interview', update it
        status_priority = {'Applied': 1, 'Interview': 2, 'Offer': 3, 'Rejected': 4}
        new_status = map_status_to_application_status(status)
        current_priority = status_priority.get(existing.status, 0)
        new_priority = status_priority.get(new_status, 0)
        
        # Update if new status is more advanced (higher priority, except Rejected)
        if new_status == 'Rejected' or (new_priority > current_priority and new_status != 'Rejected'):
            existing.status = new_status
            if location:
                existing.location = location.strip()
            existing.updated_at = datetime.now(timezone.utc)
            existing.source = 'email'  # Update source to email
            db.session.commit()
            logger.info(f"Updated existing application: {company} - {role} to status {new_status}")
            return existing
        else:
            logger.info(f"Application already exists with same or more advanced status: {company} - {role}")
            return existing
    
    # Create new application
    application_status = map_status_to_application_status(status)
    
    new_application = Application(
        user_id=user_id,
        company=company.strip(),
        role=role.strip(),
        location=location.strip() if location else None,
        status=application_status,
        source='email',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    db.session.add(new_application)
    db.session.commit()
    
    logger.info(f"Created new application: {company} - {role} with status {application_status}")
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
    
    if email_account.provider not in ['Gmail', 'Outlook']:
        logger.error(f"EmailAccount {email_account.id} has unsupported provider: {email_account.provider}")
        return {
            'total_emails': 0,
            'job_related_emails': 0,
            'applications_created': 0,
            'applications_updated': 0,
            'errors': 0,
            'applications': []
        }
    
    # Only Gmail is supported for now (Outlook will need Microsoft Graph API integration)
    if email_account.provider != 'Gmail':
        logger.warning(f"EmailAccount {email_account.id} provider {email_account.provider} not yet implemented")
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
        emails = fetch_recent_emails_for_account(email_account, max_emails=max_emails)
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
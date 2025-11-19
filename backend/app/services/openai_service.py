from openai import OpenAI
import os
import json
import logging

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))


def is_job_related_email(email_data):
    """
    Quick check to determine if an email is related to job applications.
    This is a lightweight check to filter out non-relevant emails first.
    
    Args:
        email_data: Dictionary with email fields (subject, from, body, snippet)
    
    Returns:
        Boolean: True if job-related, False otherwise
    """
    
    if not os.environ.get('OPENAI_API_KEY'):
        logger.error("OpenAI API key not configured")
        return False
    
    # Prepare email content for quick analysis
    email_content = f"""
Subject: {email_data.get('subject', '')}
From: {email_data.get('from', '')}
Preview: {email_data.get('snippet', email_data.get('body', ''))[:500]}  # Only first 500 chars for quick check
"""
    
    prompt = f"""Is this email related to a job application process? This includes:
- Confirmation of application submission (e.g., 'thank you for applying', 'we received your application', 'application submitted', etc)
- Interview invitations or scheduling
- Job offers
- Rejection letters
- Application status updates
- Internships are DEFINITELY included

This does NOT include:
- General company newsletters
- Marketing emails mentioning jobs
- Job board emails (LinkedIn, Indeed, etc.)
- LinkedIn connection requests
- General correspondence with companies that happens to mention a company name
- Emails that just mention a company name without any job application context
- Emails about courses, webinars, or other non-job application related content

Email:
{email_content}

Respond with ONLY "yes" or "no", nothing else."""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert at quickly identifying job application related emails. Respond with only 'yes' or 'no'."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Very low temperature for consistent yes/no
            max_tokens=10  # Just need yes/no
        )
        
        response_text = response.choices[0].message.content.strip().lower()
        is_job_related = response_text.startswith('yes')
        
        logger.debug(f"Quick check result: {is_job_related} for email '{email_data.get('subject', '')[:50]}'")
        return is_job_related
    
    except Exception as e:
        logger.error(f"OpenAI API error in quick check: {str(e)}")
        return False


def extract_job_application_details(email_data):
    """
    Extract detailed information from a job-related email.
    Only call this if is_job_related_email() returned True.
    
    Args:
        email_data: Dictionary with email fields (subject, from, body, snippet)
    
    Returns:
        Dictionary with:
        {
            'company': str or None,
            'role': str or None,
            'location': str or None,
            'status': str,  # 'applied', 'interview', 'offer', 'rejected', 'other'
            'confidence': float,  # 0.0 to 1.0
            'notes': str or None
        }
    """
    
    if not os.environ.get('OPENAI_API_KEY'):
        logger.error("OpenAI API key not configured")
        return None
    
    # Prepare full email content for detailed analysis
    email_content = f"""
Subject: {email_data.get('subject', '')}
From: {email_data.get('from', '')}
Body: {email_data.get('body', email_data.get('snippet', ''))[:2000]}  # Limit to 2000 chars
"""
    
    prompt = f"""Extract job application information from this email. The email is confirmed to be job-related.

Email:
{email_content}

Extract and respond with a JSON object containing:
1. "company": string or null - the company name if mentioned
2. "role": string or null - the job title/position if mentioned
3. "location": string or null - the job location (city, state, country, or "Remote") if mentioned
4. "status": string - one of: "applied" (application submitted), "interview" (interview scheduled/invitation), "offer" (job offer received), "rejected" (rejection), "other" (other job-related communication)
5. "confidence": float between 0.0 and 1.0 - how confident you are in this extraction
6. "notes": string or null - any additional relevant information

Only respond with valid JSON, no other text."""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert at extracting job application information from emails. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        try:
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            result = json.loads(response_text)
            
            # Validate and normalize
            normalized_result = {
                'company': result.get('company') if result.get('company') else None,
                'role': result.get('role') if result.get('role') else None,
                'location': result.get('location') if result.get('location') else None,
                'status': result.get('status', 'other'),
                'confidence': float(result.get('confidence', 0.0)),
                'notes': result.get('notes') if result.get('notes') else None
            }
            
            # Validate status
            allowed_statuses = ['applied', 'interview', 'offer', 'rejected', 'other']
            if normalized_result['status'] not in allowed_statuses:
                normalized_result['status'] = 'other'
            
            logger.info(f"Extracted details: company={normalized_result['company']}, role={normalized_result['role']}, location={normalized_result['location']}, status={normalized_result['status']}")
            return normalized_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {response_text[:200]}")
            return {
                'company': None,
                'role': None,
                'location': None,
                'status': 'other',
                'confidence': 0.0,
                'notes': f'Failed to parse response: {str(e)}'
            }
    
    except Exception as e:
        logger.error(f"OpenAI API error in detail extraction: {str(e)}")
        return {
            'company': None,
            'role': None,
            'location': None,
            'status': 'other',
            'confidence': 0.0,
            'notes': f'API error: {str(e)}'
        }


def analyze_email_for_job_application(email_data):
    """
    Two-step process: First check if job-related, then extract details if yes.
    
    Args:
        email_data: Dictionary with email fields (subject, from, body, snippet)
    
    Returns:
        Dictionary with analysis results, or None if not job-related:
        {
            'is_job_related': True,
            'company': str or None,
            'role': str or None,
            'status': str,
            'confidence': float,
            'notes': str or None
        }
        Returns None if email is not job-related.
    """
    
    # Step 1: Quick check
    if not is_job_related_email(email_data):
        return None  # Not job-related, don't store anything
    
    # Step 2: Extract details (only if job-related)
    details = extract_job_application_details(email_data)
    
    if not details:
        return None
    
    # Combine results
    return {
        'is_job_related': True,
        'company': details['company'],
        'role': details['role'],
        'location': details['location'],
        'status': details['status'],
        'confidence': details['confidence'],
        'notes': details['notes']
    }


def analyze_multiple_emails(emails):
    """
    Analyze multiple emails using two-step process.
    Only returns job-related emails with their extracted details.
    
    Args:
        emails: List of email dictionaries from gmail_service
    
    Returns:
        List of dictionaries, only for job-related emails:
        [
            {
                'email': email_data,
                'analysis': {
                    'is_job_related': True,
                    'company': ...,
                    'role': ...,
                    'status': ...,
                    'confidence': ...,
                    'notes': ...
                }
            },
            ...
        ]
    """
    job_related_emails = []
    
    logger.info(f"Analyzing {len(emails)} emails...")
    
    for i, email in enumerate(emails, 1):
        logger.debug(f"Processing email {i}/{len(emails)}: {email.get('subject', '')[:50]}")
        
        analysis = analyze_email_for_job_application(email)
        
        # Only add if it's job-related (analysis is not None)
        if analysis:
            job_related_emails.append({
                'email': email,
                'analysis': analysis
            })
    
    logger.info(f"Found {len(job_related_emails)} job-related emails out of {len(emails)}")
    return job_related_emails

from app import create_app
from app.services.openai_service import analyze_email_for_job_application, analyze_multiple_emails

app = create_app()

with app.app_context():
    # Test with job-related email
    job_email = {
        'subject': 'Thank you for your application - Software Engineer',
        'from': 'recruiter@techcompany.com',
        'body': 'Dear Candidate, Thank you for applying to Tech Company for the Software Engineer position. We would like to invite you for an interview on Monday.',
        'snippet': 'Thank you for applying to Tech Company...'
    }
    
    # Test with non-job email
    spam_email = {
        'subject': 'Your Amazon order has shipped',
        'from': 'noreply@amazon.com',
        'body': 'Your order #12345 has been shipped and will arrive tomorrow.',
        'snippet': 'Your order has shipped...'
    }
    
    print("Testing job-related email:")
    result1 = analyze_email_for_job_application(job_email)
    if result1:
        print(f"  ✓ Job-related! Company: {result1['company']}, Status: {result1['status']}")
    else:
        print("  ✗ Not job-related")
    
    print("\nTesting non-job email:")
    result2 = analyze_email_for_job_application(spam_email)
    if result2:
        print(f"  ✗ Incorrectly identified as job-related")
    else:
        print("  ✓ Correctly filtered out (not job-related)")
from app import create_app
from app.models import User, Application
from app.services.email_processor import process_initial_sync

app = create_app()

with app.app_context():
    # Find a user who logged in with Google
    user = User.query.filter_by(oauth_provider='google').first()
    
    if not user:
        print("No Google OAuth user found. Please log in with Google first.")
    else:
        print(f"Testing email processor for user: {user.email}")
        print(f"User ID: {user.id}")
        print("\n" + "="*50)
        print("Starting email processing...")
        print("="*50 + "\n")
        
        # Check existing applications before
        existing_apps = Application.query.filter_by(user_id=user.id).count()
        print(f"Existing applications before processing: {existing_apps}\n")
        
        # Process emails
        results = process_initial_sync(user, max_emails=10)  # Process only 10 emails for testing
        
        print("\n" + "="*50)
        print("Processing Results:")
        print("="*50)
        print(f"Total emails fetched: {results['total_emails']}")
        print(f"Job-related emails found: {results['job_related_emails']}")
        print(f"Applications created: {results['applications_created']}")
        print(f"Applications updated: {results['applications_updated']}")
        print(f"Errors: {results['errors']}")
        
        if results['applications']:
            print(f"\n{'='*50}")
            print("Applications created/updated:")
            print("="*50)
            for app in results['applications']:
                print(f"  • {app.company} - {app.role} ({app.status}) [Source: {app.source}]")
        
        # Check applications after
        new_apps = Application.query.filter_by(user_id=user.id).count()
        print(f"\n{'='*50}")
        print(f"Total applications after processing: {new_apps}")
        print(f"Net change: {new_apps - existing_apps}")
        print("="*50)


from app import create_app
from app.models import User
from app.services.gmail_service import fetch_recent_emails

# Create Flask app
app = create_app()

# Run test within app context
with app.app_context():
    # Find a user who logged in with Google
    user = User.query.filter_by(oauth_provider='google').first()
    
    if user:
        print(f"Testing Gmail service for user: {user.email}")
        print(f"User ID: {user.id}")
        
        # Fetch emails
        emails = fetch_recent_emails(user)
        print(f"\nFetched {len(emails)} emails")
        
        if emails:
            print(f"\nFirst email:")
            print(f"Subject: {emails[0]['subject']}")
            print(f"From: {emails[0]['from']}")
            print(f"Snippet: {emails[0]['snippet'][:100]}...")
    else:
        print("No Google OAuth user found. Please log in with Google first.")
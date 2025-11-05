from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
import os
import logging
from dotenv import load_dotenv
from flask_cors import CORS
from datetime import datetime, timezone


load_dotenv()

# Initialize SQLAlchemy and Migrate so they can be imported in other files
db = SQLAlchemy()
migrate = Migrate()
scheduler = APScheduler()

logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # APScheduler configuration
    app.config['SCHEDULER_API_ENABLED'] = False  # Disable API endpoint for security
    app.config['SCHEDULER_TIMEZONE'] = 'UTC'

    # Initialize extensions
    db.init_app(app)
    from . import models
    migrate.init_app(app, db)
    scheduler.init_app(app)

    # Import and register blueprints
    from .routes import health_bp, auth_bp, accounts_bp, application_bp, oauth_bp, gmail_bp
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(application_bp)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(gmail_bp)

    # Scheduled job for email sync (runs every 30 minutes)
    @scheduler.task('interval', id='sync_email_accounts', minutes=30, misfire_grace_time=900)
    def sync_email_accounts():
        """Background job to sync all connected email accounts"""
        with app.app_context():
            from .models import EmailAccount, User
            
            logger.info("Starting scheduled email sync job")
            
            # Get all active email accounts (not in error state)
            active_accounts = EmailAccount.query.filter(
                EmailAccount.sync_status != 'error'
            ).all()
            
            if not active_accounts:
                logger.info("No active email accounts to sync")
                return
            
            logger.info(f"Found {len(active_accounts)} active email accounts to sync")
            
            for account in active_accounts:
                try:
                    # Skip if already syncing
                    if account.sync_status == 'syncing':
                        logger.info(f"Skipping account {account.id} - already syncing")
                        continue
                    
                    # Update status to syncing
                    account.sync_status = 'syncing'
                    db.session.commit()
                    
                    # Get the user for this account
                    user = User.query.get(account.user_id)
                    if not user:
                        logger.error(f"User not found for email account {account.id}")
                        account.sync_status = 'error'
                        db.session.commit()
                        continue
                    
                    logger.info(f"Syncing email account {account.id} ({account.email_address})")
                    
                    # Process emails for this account
                    from app.services.email_processor import process_incremental_sync_for_account
                    
                    # Use incremental sync (will use last_synced_at for filtering)
                    results = process_incremental_sync_for_account(account)
                    
                    # Status is updated by the processor function
                    logger.info(
                        f"Completed sync for email account {account.id}: "
                        f"{results.get('applications_created', 0)} created, "
                        f"{results.get('applications_updated', 0)} updated"
                    )
                    
                except Exception as e:
                    logger.error(f"Error syncing email account {account.id}: {str(e)}", exc_info=True)
                    account.sync_status = 'error'
                    db.session.rollback()
                    try:
                        db.session.commit()
                    except:
                        pass
            
            logger.info("Scheduled email sync job completed")

    # Start the scheduler
    scheduler.start()

    # Register error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f'Internal server error: {error}')
        return jsonify({'error': 'Internal server error'}), 500


    return app


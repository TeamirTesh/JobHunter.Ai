from flask import Blueprint, request, jsonify
from app.models import User, EmailAccount
from app import db

# Blueprint for accounts routes
accounts_bp = Blueprint('accounts', __name__)

# GET USER - GET BY USER ID
@accounts_bp.route('/accounts/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'name': user.name,
        'created_at': user.created_at.isoformat()
    })

# UPDATE USER - PATCH
@accounts_bp.route('/accounts/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    
    data = request.get_json()
    if 'username' in data:
        user.username = data['username']
    if 'name' in data:
        user.name = data['name']

    db.session.commit()

    return jsonify({
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'name': user.name,
        'created_at': user.created_at.isoformat()
    }), 200

# ADD NEW EMAIL ACCOUNT - POST
@accounts_bp.route('/email-accounts', methods=['POST'])
def add_email_account():
    data = request.get_json()
    user_id = data.get('user_id')
    provider = data.get('provider')
    email_address = data.get('email_address')
    
    if not all([user_id, provider, email_address]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    new_email_account = EmailAccount(
        user_id=user_id,
        provider=provider,
        email_address=email_address
    )
    db.session.add(new_email_account)
    db.session.commit()
    
    return jsonify({
        'message': 'Email account added successfully',
        'email_account': {
            'id': new_email_account.id,
            'user_id': new_email_account.user_id,
            'provider': new_email_account.provider,
            'email_address': new_email_account.email_address,
            'added_at': new_email_account.added_at.isoformat()
        }
    }), 201

# GET ALL EMAIL ACCOUNTS FOR A USER - GET
@accounts_bp.route('/email-accounts/<int:user_id>', methods=['GET'])
def get_email_accounts(user_id):
    email_accounts = EmailAccount.query.filter_by(user_id=user_id).all()
    result = [
        {
            'id': account.id,
            'user_id': account.user_id,
            'provider': account.provider,
            'email_address': account.email_address,
            'added_at': account.added_at.isoformat()
        }
        for account in email_accounts
    ]
    return jsonify(result), 200


# DELETE EMAIL ACCOUNT - DELETE
@accounts_bp.route('/email-accounts/<int:email_account_id>', methods=['DELETE'])
def delete_email_account(email_account_id):
    email_account = EmailAccount.query.get_or_404(email_account_id)
    db.session.delete(email_account)
    db.session.commit()
    return jsonify({'message': 'Email account deleted successfully',
        'email_account': {
            'id': email_account.id,
            'user_id': email_account.user_id,
            'provider': email_account.provider,
            'email_address': email_account.email_address,
            'added_at': email_account.added_at.isoformat()
        }
    }), 200
from flask import Blueprint, request, jsonify
from app.models import User
from app import db

bp = Blueprint('accounts', __name__)


accounts_bp = Blueprint('accounts', __name__)

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
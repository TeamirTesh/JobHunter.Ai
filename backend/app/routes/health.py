# app/routes/health.py
from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health():
    # Check if server is running
    return jsonify({'status': 'OK'}), 200

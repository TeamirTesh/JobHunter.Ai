from flask import Blueprint, request, jsonify
from app.models import User
from app import db
from app.models import Application
from datetime import datetime, timezone

application_bp = Blueprint('applications', __name__)

# ADD APPLICATION - POST
@application_bp.route('/applications', methods = ['POST'])
def add_application():
    data = request.get_json()
    user_id = data.get('user_id')
    company = data.get('company')
    role = data.get('role')
    status = data.get('status', 'applied')
    source = data.get('source', 'manual')
    created_at = data.get('created_at', datetime.now(timezone.utc))
    updated_at = data.get('updated_at', datetime.now(timezone.utc))

    if not all([user_id, company, role]):
        return jsonify({'error': 'Missing required fields'}), 400

    new_application = Application(company=company, role=role, status=status, source=source)
    db.session.add(new_application)
    db.session.commit()
    
    return jsonify({'message': 'Application added successfully', 
        'application': {
            'id': new_application.id,
            'user_id': new_application.user_id,
            'company': new_application.company,
            'role': new_application.role,
            'status': new_application.status,
            'source': new_application.source,
            'created_at': new_application.created_at.isoformat(),
            'updated_at': new_application.updated_at.isoformat()
        }
    }), 201

# UPDATE STATUS - PATCH
@application_bp.route('/applications/<int:application_id>', methods = ['PATCH'])
def update_application(application_id):
    application_record = Application.query.get_or_404(application_id)
    data = request.get_json()
    if "status" in data:
        application_record.status = data["status"]
        db.session.commit()

    return jsonify({'message': 'Application updated successfully'}), 200

# DELETE APPLICATION - DELETE
@application_bp.route('/applications/<int:application_id>', methods = ['DELETE'])
def delete_application(application_id):
    application_record = Application.query.get_or_404(application_id)
    db.session.delete(application_record)
    db.session.commit()
    return jsonify({'message': 'Application deleted successfully'}), 200

# GET ALL APPLICATIONS - GET
@application_bp.route('/applications', methods = ['GET'])
def get_all_applications():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    applications = Application.query.filter_by(user_id=user_id).all()
    result = [
        {'id' : application.id,
         'user_id' : application.user_id,
         'company' : application.company,
         'role' : application.role,
         'status' : application.status,
         'source' : application.source,
         'created_at' : application.created_at.isoformat(),
         'updated_at' : application.updated_at.isoformat()}
        for application in applications
    ]
    return jsonify(result), 200
    
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
    company_domain = data.get('company_domain')
    location = data.get('location')
    status = data.get('status', 'applied')
    source = data.get('source', 'manual')
    created_at = data.get('created_at', datetime.now(timezone.utc))
    updated_at = data.get('updated_at', datetime.now(timezone.utc))

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    new_application = Application(
        user_id=user_id,
        company=(company.strip() or None) if company else None,
        role=(role.strip() or None) if role else None,
        company_domain=(company_domain.strip() or None) if company_domain else None,
        location=(location.strip() or None) if location else None,
        status=status,
        source=source,
        created_at=created_at,
        updated_at=updated_at
    )
    db.session.add(new_application)
    db.session.commit()
    
    return jsonify({'message': 'Application added successfully', 
        'application': _application_to_dict(new_application)
    }), 201

# UPDATE STATUS - PATCH
@application_bp.route('/applications/<int:application_id>', methods = ['PATCH'])
def update_application(application_id):
    application_record = Application.query.get_or_404(application_id)
    data = request.get_json()
    
    # Update all fields that are provided (allow null/empty)
    if "company" in data:
        application_record.company = (data["company"].strip() or None) if data.get("company") else None
    if "role" in data:
        application_record.role = (data["role"].strip() or None) if data.get("role") else None
    if "company_domain" in data:
        application_record.company_domain = (data["company_domain"].strip() or None) if data.get("company_domain") else None
    if "location" in data:
        application_record.location = (data["location"].strip() or None) if data.get("location") else None
    if "status" in data:
        application_record.status = data["status"]
    if "source" in data:
        application_record.source = data["source"]
    
    application_record.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({'message': 'Application updated successfully', 
        'application': _application_to_dict(application_record)
    }), 200


# DELETE APPLICATION - DELETE
@application_bp.route('/applications/<int:application_id>', methods = ['DELETE'])
def delete_application(application_id):
    application_record = Application.query.get_or_404(application_id)
    db.session.delete(application_record)
    db.session.commit()
    return jsonify({'message': 'Application deleted successfully',
        'application': _application_to_dict(application_record)
    }), 200


def _application_to_dict(application):
    return {
        'id': application.id,
        'user_id': application.user_id,
        'company': application.company,
        'role': application.role,
        'company_domain': application.company_domain,
        'location': application.location,
        'status': application.status,
        'source': application.source,
        'created_at': application.created_at.isoformat(),
        'updated_at': application.updated_at.isoformat()
    }


# GET ALL APPLICATIONS - GET
@application_bp.route('/applications', methods = ['GET'])
def get_all_applications():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    applications = Application.query.filter_by(user_id=user_id).all()
    result = [_application_to_dict(app) for app in applications]
    return jsonify(result), 200
    
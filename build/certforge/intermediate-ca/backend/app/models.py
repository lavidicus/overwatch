from app import db
from datetime import datetime

class Certificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    serial_number = db.Column(db.String(128), unique=True, nullable=False)
    common_name = db.Column(db.String(255), nullable=False)
    organization = db.Column(db.String(255))
    organizational_unit = db.Column(db.String(255))
    key_size = db.Column(db.Integer, default=2048)
    validity_days = db.Column(db.Integer, default=365)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    status = db.Column(db.String(50), default="active")
    csr_path = db.Column(db.String(512))
    cert_path = db.Column(db.String(512))
    key_path = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.String(255))
    ip_address = db.Column(db.String(45))
    details = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

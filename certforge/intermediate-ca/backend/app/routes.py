from flask import Blueprint, render_template, request, jsonify, send_file
from app.models import Certificate
from app import db
from datetime import datetime, timedelta
import os
import subprocess

main = Blueprint("main", __name__)

@main.route("/")
def index():
    return render_template("index.html")

@main.route("/request", methods=["GET", "POST"])
def request_certificate():
    if request.method == "POST":
        data = request.form
        cn = data.get("common_name")
        org = data.get("organization")
        key_size = int(data.get("key_size", 2048))
        validity_days = int(data.get("validity_days", 365))

        # Generate certificate
        cert_path, key_path, serial = generate_leaf_certificate(cn, org, key_size, validity_days)

        cert = Certificate(
            serial_number=serial,
            common_name=cn,
            organization=org,
            key_size=key_size,
            validity_days=validity_days,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=validity_days),
            cert_path=cert_path,
            key_path=key_path
        )
        db.session.add(cert)
        db.session.commit()

        return render_template("success.html", cert=cert)

    return render_template("request.html")

@main.route("/validate")
def validate_certificate():
    serial = request.args.get("serial")
    cert = Certificate.query.filter_by(serial_number=serial).first()

    if not cert:
        return jsonify({"status": "not_found"}), 404

    return jsonify({
        "serial_number": cert.serial_number,
        "common_name": cert.common_name,
        "organization": cert.organization,
        "status": cert.status,
        "valid_from": cert.start_date,
        "valid_to": cert.end_date
    })

@main.route("/download/<serial>")
def download_certificate(serial):
    cert = Certificate.query.filter_by(serial_number=serial).first()
    if not cert:
        return "Certificate not found", 404
    return send_file(cert.cert_path, as_attachment=True)


def generate_leaf_certificate(cn, org, key_size, validity_days):
    base_dir = "/etc/pki/certforge/intermediate"
    os.makedirs(f"{base_dir}/issued", exist_ok=True)
    os.makedirs(f"{base_dir}/private", exist_ok=True)

    key_path = f"{base_dir}/private/{cn}.key"
    csr_path = f"{base_dir}/csr/{cn}.csr"
    cert_path = f"{base_dir}/issued/{cn}.crt"

    # Generate private key
    subprocess.run([
        "openssl", "genpkey", "-algorithm", "RSA",
        "-pkeyopt", f"rsa_keysize:{key_size}",
        "-out", key_path
    ], check=True)

    # Generate CSR
    subprocess.run([
        "openssl", "req", "-new", "-key", key_path,
        "-out", csr_path,
        "-subj", f"/C=US/ST=California/L=San Francisco/O={org}/CN={cn}"
    ], check=True)

    # Sign with intermediate CA
    subprocess.run([
        "openssl", "ca", "-config", "/etc/pki/certforge/intermediate/intermediate-ca.conf",
        "-extensions", "v3_leaf",
        "-days", str(validity_days),
        "-notext",
        "-in", csr_path,
        "-out", cert_path
    ], check=True)

    # Extract serial number
    serial = subprocess.check_output([
        "openssl", "x509", "-in", cert_path, "-noout", "-serial"
    ]).decode().strip().split("=")[1]

    return cert_path, key_path, serial

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'intermediate-ca'
    })

@app.route('/api/certs', methods=['POST'])
def issue_cert():
    """Issue certificate from intermediate CA"""
    try:
        data = request.get_json()
        cn = data.get('common_name', 'localhost')
        days = data.get('days', 365)
        
        # Generate key and CSR
        key_path = f'/tmp/{cn}.key'
        csr_path = f'/tmp/{cn}.csr'
        cert_path = f'/tmp/{cn}.pem'
        
        subprocess.run(['openssl', 'genrsa', '-out', key_path, '2048'], check=True)
        subprocess.run([
            'openssl', 'req', '-new', '-key', key_path,
            '-out', csr_path,
            '-subj', f'/CN={cn}'
        ], check=True)
        
        # Sign with intermediate CA
        subprocess.run([
            'openssl', 'x509', '-req',
            '-in', csr_path,
            '-CA', '/opt/certforge/intermediate-ca/certs/intermediate-ca.pem',
            '-CAkey', '/opt/certforge/intermediate-ca/private/intermediate-ca.key',
            '-CAcreateserial',
            '-out', cert_path,
            '-days', str(days),
            '-sha256'
        ], check=True)
        
        return jsonify({
            'status': 'issued',
            'certificate': cert_path,
            'common_name': cn
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

# CertForge Docker API Backend
# Flask API for orchestrating CA containers and managing certificates

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import docker
import subprocess
import os
import uuid
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Docker client
client = docker.DockerClient()

# Paths
CERTFORGE_ROOT = "/opt/certforge"
ROOT_CA_PATH = f"{CERTFORGE_ROOT}/root-ca"
INTERMEDIATE_CA_PATH = f"{CERTFORGE_ROOT}/intermediate-ca"

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/containers', methods=['GET'])
def list_containers():
    """List all CertForge containers"""
    try:
        containers = client.containers.list(all=True)
        result = []
        
        for container in containers:
            if 'certforge' in container.name:
                result.append({
                    'id': container.id[:12],
                    'name': container.name,
                    'status': container.status,
                    'image': container.image.tags[0] if container.image.tags else container.image.short_id,
                    'ports': container.ports,
                    'created': datetime.fromtimestamp(container.attrs['Created']).isoformat()
                })
        
        return jsonify({'containers': result})
    except Exception as e:
        logger.error(f"Error listing containers: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/containers/<container_name>/start', methods=['POST'])
def start_container(container_name):
    """Start a container"""
    try:
        container = client.containers.get(container_name)
        container.start()
        return jsonify({'status': 'started', 'container': container_name})
    except docker.errors.NotFound:
        return jsonify({'error': f'Container {container_name} not found'}), 404
    except Exception as e:
        logger.error(f"Error starting container: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/containers/<container_name>/stop', methods=['POST'])
def stop_container(container_name):
    """Stop a container"""
    try:
        container = client.containers.get(container_name)
        container.stop()
        return jsonify({'status': 'stopped', 'container': container_name})
    except docker.errors.NotFound:
        return jsonify({'error': f'Container {container_name} not found'}), 404
    except Exception as e:
        logger.error(f"Error stopping container: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/containers/<container_name>/restart', methods=['POST'])
def restart_container(container_name):
    """Restart a container"""
    try:
        container = client.containers.get(container_name)
        container.restart()
        return jsonify({'status': 'restarted', 'container': container_name})
    except docker.errors.NotFound:
        return jsonify({'error': f'Container {container_name} not found'}), 404
    except Exception as e:
        logger.error(f"Error restarting container: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/containers/<container_name>/logs', methods=['GET'])
def get_logs(container_name):
    """Get container logs"""
    try:
        container = client.containers.get(container_name)
        logs = container.logs(tail=100, stream=False).decode('utf-8')
        return jsonify({'logs': logs})
    except docker.errors.NotFound:
        return jsonify({'error': f'Container {container_name} not found'}), 404
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/certs', methods=['GET'])
def list_certs():
    """List issued certificates"""
    try:
        cert_dir = f"{INTERMEDIATE_CA_PATH}/certs"
        if not os.path.exists(cert_dir):
            return jsonify({'certificates': []})
        
        certs = []
        for cert_file in os.listdir(cert_dir):
            if cert_file.endswith('.pem'):
                certs.append(cert_file)
        
        return jsonify({'certificates': certs})
    except Exception as e:
        logger.error(f"Error listing certificates: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/certs/<cert_name>', methods=['GET'])
def get_cert(cert_name):
    """Download a certificate"""
    try:
        cert_path = f"{INTERMEDIATE_CA_PATH}/certs/{cert_name}"
        if not os.path.exists(cert_path):
            return jsonify({'error': 'Certificate not found'}), 404
        
        return send_from_directory(
            os.path.dirname(cert_path),
            cert_name,
            as_attachment=True
        )
    except Exception as e:
        logger.error(f"Error getting certificate: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/crl', methods=['GET'])
def get_crl():
    """Get Certificate Revocation List"""
    try:
        crl_path = f"{INTERMEDIATE_CA_PATH}/crl/root-ca.crl.pem"
        if not os.path.exists(crl_path):
            return jsonify({'error': 'CRL not found'}), 404
        
        return send_from_directory(
            os.path.dirname(crl_path),
            os.path.basename(crl_path),
            as_attachment=True
        )
    except Exception as e:
        logger.error(f"Error getting CRL: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/intermediate/issue', methods=['POST'])
def issue_certificate():
    """Request certificate issuance from intermediate CA"""
    try:
        data = request.get_json()
        cn = data.get('common_name', 'localhost')
        days = data.get('days', 365)
        
        # Generate CSR
        csr_dir = f"{INTERMEDIATE_CA_PATH}/csr"
        os.makedirs(csr_dir, exist_ok=True)
        
        csr_path = f"{csr_dir}/{cn}.csr"
        key_path = f"{csr_dir}/{cn}.key"
        
        # Generate private key
        subprocess.run([
            'openssl', 'genrsa', '-out', key_path, '2048'
        ], check=True)
        
        # Generate CSR
        subprocess.run([
            'openssl', 'req', '-new', '-key', key_path,
            '-out', csr_path,
            '-subj', f'/CN={cn}'
        ], check=True)
        
        # Sign with intermediate CA
        cert_path = f"{INTERMEDIATE_CA_PATH}/certs/{cn}.pem"
        subprocess.run([
            'openssl', 'x509', '-req',
            '-in', csr_path,
            '-CA', f"{INTERMEDIATE_CA_PATH}/certs/intermediate-ca.pem",
            '-CAkey', f"{INTERMEDIATE_CA_PATH}/private/intermediate-ca.key",
            '-CAcreateserial',
            '-out', cert_path,
            '-days', str(days),
            '-sha256'
        ], check=True)
        
        return jsonify({
            'status': 'issued',
            'certificate': cert_path,
            'common_name': cn,
            'days': days
        })
    except subprocess.CalledProcessError as e:
        logger.error(f"OpenSSL error: {e}")
        return jsonify({'error': 'Certificate issuance failed'}), 500
    except Exception as e:
        logger.error(f"Error issuing certificate: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

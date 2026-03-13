# Flask API with JWT Authentication

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import docker
import subprocess
import os
import uuid
from datetime import datetime, timedelta
import logging
import jwt
import hashlib
import secrets

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
app.config['JWT_SECRET_KEY'] = secrets.token_hex(32)
app.config['JWT_EXPIRATION_HOURS'] = 24

# Docker client
client = docker.DockerClient()

# Paths
CERTFORGE_ROOT = "/opt/certforge"
ROOT_CA_PATH = f"{CERTFORGE_ROOT}/root-ca"
INTERMEDIATE_CA_PATH = f"{CERTFORGE_ROOT}/intermediate-ca"

# In-memory user database (replace with actual DB in production)
USERS = {
    'admin': {
        'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
        'role': 'admin',
        'permissions': ['read', 'write', 'admin']
    },
    'user': {
        'password_hash': hashlib.sha256('user123'.encode()).hexdigest(),
        'role': 'user',
        'permissions': ['read', 'write']
    }
}

def generate_token(user_id):
    """Generate JWT token"""
    expiration = datetime.utcnow() + timedelta(hours=app.config['JWT_EXPIRATION_HOURS'])
    payload = {
        'user_id': user_id,
        'exp': expiration,
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    """Verify JWT token and return user info"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator for requiring authentication"""
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header required'}), 401
        
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
        except IndexError:
            return jsonify({'error': 'Invalid authorization format'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.user = payload
        return f(*args, **kwargs)
    decorated.__name__ = f.__name__
    return decorated

def require_permission(permission):
    """Decorator for requiring specific permission"""
    def decorator(f):
        def decorated(*args, **kwargs):
            if not hasattr(request, 'user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user = USERS.get(request.user['user_id'])
            if not user or permission not in user.get('permissions', []):
                return jsonify({'error': f'Permission {permission} required'}), 403
            
            return f(*args, **kwargs)
        decorated.__name__ = f.__name__
        return decorated
    return decorator

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        user = USERS.get(username)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if password_hash != user['password_hash']:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        token = generate_token(username)
        
        return jsonify({
            'token': token,
            'user': {
                'id': username,
                'role': user['role'],
                'permissions': user['permissions']
            }
        })
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/containers', methods=['GET'])
@require_auth
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
@require_auth
@require_permission('write')
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
@require_auth
@require_permission('write')
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
@require_auth
@require_permission('write')
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
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
@require_permission('write')
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

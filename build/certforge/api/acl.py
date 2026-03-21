# ACL (Access Control List) Module for CertForge

from flask import Flask, jsonify, request
import os
import json
from datetime import datetime
from typing import Dict, List, Set

class ACLManager:
    """Access Control List manager for certificate operations"""
    
    def __init__(self, acl_file: str = '/opt/certforge/acl.json'):
        self.acl_file = acl_file
        self.acl_data = self._load_acl()
    
    def _load_acl(self) -> Dict:
        """Load ACL data from file"""
        if os.path.exists(self.acl_file):
            with open(self.acl_file, 'r') as f:
                return json.load(f)
        return {
            'certificates': {},
            'users': {},
            'policies': {}
        }
    
    def _save_acl(self):
        """Save ACL data to file"""
        os.makedirs(os.path.dirname(self.acl_file), exist_ok=True)
        with open(self.acl_file, 'w') as f:
            json.dump(self.acl_data, f, indent=2)
    
    def add_user_acl(self, username: str, permissions: List[str]) -> bool:
        """Add ACL for a user"""
        if username not in self.acl_data['users']:
            self.acl_data['users'][username] = {
                'permissions': [],
                'certificates': [],
                'created': datetime.utcnow().isoformat()
            }
        
        for perm in permissions:
            if perm not in self.acl_data['users'][username]['permissions']:
                self.acl_data['users'][username]['permissions'].append(perm)
        
        self._save_acl()
        return True
    
    def add_certificate_acl(self, cert_name: str, allowed_users: List[str], 
                           allowed_roles: List[str]) -> bool:
        """Add ACL for a certificate"""
        if cert_name not in self.acl_data['certificates']:
            self.acl_data['certificates'][cert_name] = {
                'allowed_users': [],
                'allowed_roles': [],
                'created': datetime.utcnow().isoformat()
            }
        
        for user in allowed_users:
            if user not in self.acl_data['certificates'][cert_name]['allowed_users']:
                self.acl_data['certificates'][cert_name]['allowed_users'].append(user)
        
        for role in allowed_roles:
            if role not in self.acl_data['certificates'][cert_name]['allowed_roles']:
                self.acl_data['certificates'][cert_name]['allowed_roles'].append(role)
        
        self._save_acl()
        return True
    
    def check_user_permission(self, username: str, required_permission: str) -> bool:
        """Check if user has required permission"""
        if username not in self.acl_data['users']:
            return False
        
        return required_permission in self.acl_data['users'][username]['permissions']
    
    def check_certificate_access(self, cert_name: str, username: str, 
                                 user_roles: List[str]) -> bool:
        """Check if user can access specific certificate"""
        # Check if certificate exists in ACL
        if cert_name in self.acl_data['certificates']:
            cert_acl = self.acl_data['certificates'][cert_name]
            
            # Check user whitelist
            if username in cert_acl['allowed_users']:
                return True
            
            # Check role whitelist
            for role in user_roles:
                if role in cert_acl['allowed_roles']:
                    return True
            
            return False
        
        # If certificate not in ACL, allow access (default deny policy)
        return False
    
    def get_user_acls(self, username: str) -> Dict:
        """Get all ACLs for a user"""
        if username not in self.acl_data['users']:
            return {}
        
        return self.acl_data['users'][username]
    
    def list_certificates_for_user(self, username: str, user_roles: List[str]) -> List[str]:
        """List all certificates a user can access"""
        accessible = []
        
        for cert_name, cert_acl in self.acl_data['certificates'].items():
            if self.check_certificate_access(cert_name, username, user_roles):
                accessible.append(cert_name)
        
        return accessible
    
    def revoke_certificate_access(self, cert_name: str, username: str) -> bool:
        """Revoke certificate access for a user"""
        if cert_name not in self.acl_data['certificates']:
            return False
        
        if username in self.acl_data['certificates'][cert_name]['allowed_users']:
            self.acl_data['certificates'][cert_name]['allowed_users'].remove(username)
            self._save_acl()
            return True
        
        return False

# Flask blueprint for ACL endpoints
def create_acl_bp(acl_manager: ACLManager):
    """Create Flask blueprint for ACL management"""
    bp = Flask('acl')
    
    @bp.route('/api/acl/users', methods=['GET'])
    def list_users():
        """List all users with ACLs"""
        return jsonify({'users': list(acl_manager.acl_data['users'].keys())})
    
    @bp.route('/api/acl/users/<username>', methods=['GET'])
    def get_user_acl(username):
        """Get ACL for a specific user"""
        return jsonify(acl_manager.get_user_acls(username))
    
    @bp.route('/api/acl/users/<username>', methods=['POST'])
    def set_user_acl(username):
        """Set ACL for a user"""
        data = request.get_json()
        permissions = data.get('permissions', [])
        acl_manager.add_user_acl(username, permissions)
        return jsonify({'status': 'updated', 'user': username})
    
    @bp.route('/api/acl/certificates', methods=['GET'])
    def list_certificates():
        """List all certificates with ACLs"""
        return jsonify({'certificates': list(acl_manager.acl_data['certificates'].keys())})
    
    @bp.route('/api/acl/certificates/<cert_name>', methods=['POST'])
    def set_certificate_acl(cert_name):
        """Set ACL for a certificate"""
        data = request.get_json()
        allowed_users = data.get('allowed_users', [])
        allowed_roles = data.get('allowed_roles', [])
        acl_manager.add_certificate_acl(cert_name, allowed_users, allowed_roles)
        return jsonify({'status': 'updated', 'certificate': cert_name})
    
    @bp.route('/api/acl/certificates/<cert_name>/revoke/<username>', methods=['DELETE'])
    def revoke_access(cert_name, username):
        """Revoke certificate access"""
        if acl_manager.revoke_certificate_access(cert_name, username):
            return jsonify({'status': 'revoked', 'certificate': cert_name, 'user': username})
        return jsonify({'error': 'Access not found'}), 404
    
    return bp

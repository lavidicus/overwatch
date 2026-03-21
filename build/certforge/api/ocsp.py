# OCSP Responder for CertForge

import subprocess
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
import asn1
import struct

class OCSPResponder:
    """OCSP (Online Certificate Status Protocol) responder"""
    
    def __init__(self, intermediate_ca_path: str = '/opt/certforge/intermediate-ca'):
        self.intermediate_ca_path = intermediate_ca_path
        self.ca_cert_path = f"{intermediate_ca_path}/certs/intermediate-ca.pem"
        self.ca_key_path = f"{intermediate_ca_path}/private/intermediate-ca.key"
        self.db_path = f"{intermediate_ca_path}/ocsp.db"
        self.responder_cert_path = f"{intermediate_ca_path}/certs/ocsp-responder.pem"
        self.responder_key_path = f"{intermediate_ca_path}/private/ocsp-responder.key"
    
    def generate_responder_key(self):
        """Generate OCSP responder key pair"""
        try:
            # Generate responder private key
            subprocess.run([
                'openssl', 'genrsa', '-out', self.responder_key_path, '2048'
            ], check=True, capture_output=True)
            
            # Generate self-signed certificate for OCSP responder
            subprocess.run([
                'openssl', 'req', '-new', '-key', self.responder_key_path,
                '-out', '/tmp/ocsp-responder.csr',
                '-subj', '/CN=OCSP-Responder/O=CertForge/C=US'
            ], check=True, capture_output=True)
            
            # Sign responder certificate (valid for 1 year)
            subprocess.run([
                'openssl', 'x509', '-req',
                '-in', '/tmp/ocsp-responder.csr',
                '-CA', self.ca_cert_path,
                '-CAkey', self.ca_key_path,
                '-CAcreateserial',
                '-out', self.responder_cert_path,
                '-days', '365',
                '-extfile', f"{self.intermediate_ca_path}/config/ocsp-extensions.cnf",
                '-sha256'
            ], check=True, capture_output=True)
            
            # Set proper permissions
            os.chmod(self.responder_key_path, 0o600)
            
            return True
        except subprocess.CalledProcessError as e:
            print(f"OCSP key generation failed: {e}")
            return False
    
    def sign_ocsp_response(self, cert_serial: str, status: str, 
                          now: datetime, next_update: datetime) -> bytes:
        """Sign an OCSP response"""
        try:
            # Create OCSP request data
            ocsp_req_path = '/tmp/ocsp-req.pem'
            
            # Generate OCSP response using OpenSSL
            response = subprocess.run([
                'openssl', 'ocsp',
                '-respond',
                '-issuer', self.ca_cert_path,
                '-signkey', self.ca_key_path,
                '-cert', self.ca_cert_path,
                '-response', 'basic',
                '-status', status,
                '-serial', cert_serial,
                '-nmin', '0',
                '-next', next_update.strftime('%b %d %H:%M:%S %Y %Z')
            ], capture_output=True)
            
            if response.returncode != 0:
                print(f"OCSP signing failed: {response.stderr.decode()}")
                return b''
            
            return response.stdout
            
        except Exception as e:
            print(f"OCSP signing error: {e}")
            return b''
    
    def get_cert_status(self, cert_serial: str) -> Tuple[str, datetime, datetime]:
        """Get certificate status from database"""
        # In production, this would query a real database
        # For now, check if serial is in our certs directory
        
        certs_dir = f"{self.intermediate_ca_path}/certs"
        cert_file = f"{certs_dir}/{cert_serial}.pem"
        
        if os.path.exists(cert_file):
            # Certificate is valid
            now = datetime.utcnow()
            next_update = now + timedelta(hours=24)
            return ('good', now, next_update)
        else:
            # Check revocation list
            crl_file = f"{self.intermediate_ca_path}/crl/root-ca.crl.pem"
            if os.path.exists(crl_file):
                # Check if serial is in CRL
                result = subprocess.run([
                    'openssl', 'crl',
                    '-in', crl_file,
                    '-text',
                    '-noout'
                ], capture_output=True, text=True)
                
                if cert_serial in result.stdout:
                    now = datetime.utcnow()
                    next_update = now + timedelta(hours=1)
                    return ('revoked', now, next_update)
            
            # Default: certificate not found
            now = datetime.utcnow()
            next_update = now + timedelta(hours=1)
            return ('unknown', now, next_update)
    
    def handle_ocsp_request(self, der_data: bytes) -> bytes:
        """Handle an incoming OCSP request (DER encoded)"""
        # Parse OCSP request (simplified - in production use proper ASN.1 parser)
        # For now, just return a basic response
        
        # Extract certificate serial (placeholder - extract from actual request)
        cert_serial = "1234567890ABCDEF"  # Extract from request in real impl
        
        # Get status
        status, this_update, next_update = self.get_cert_status(cert_serial)
        
        # Generate response
        response = self.sign_ocsp_response(
            cert_serial=cert_serial,
            status=status,
            now=this_update,
            next_update=next_update
        )
        
        return response

# Simple HTTP server for OCSP responder
from flask import Flask, request, Response
import base64

ocsp_app = Flask('ocsp-responder')
responder = OCSPResponder()

@ocsp_app.route('/ocsp', methods=['POST'])
def ocsp_endpoint():
    """OCSP responder endpoint"""
    try:
        # Parse DER-encoded OCSP request
        request_data = request.data
        
        # Generate response
        response_data = responder.handle_ocsp_request(request_data)
        
        if response_data:
            return Response(
                response_data,
                mimetype='application/ocsp-response'
            )
        else:
            return Response(
                b'Error generating response',
                status=500,
                mimetype='text/plain'
            )
    
    except Exception as e:
        print(f"OCSP error: {e}")
        return Response(
            b'Internal error',
            status=500,
            mimetype='text/plain'
        )

if __name__ == '__main__':
    ocsp_app.run(host='0.0.0.0', port=8888)

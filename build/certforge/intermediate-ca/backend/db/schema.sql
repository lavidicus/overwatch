CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(128) UNIQUE NOT NULL,
    common_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    organizational_unit VARCHAR(255),
    key_size INTEGER NOT NULL,
    validity_days INTEGER NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    csr_path VARCHAR(512),
    cert_path VARCHAR(512),
    key_path VARCHAR(512),
    revoked_date TIMESTAMP,
    revocation_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

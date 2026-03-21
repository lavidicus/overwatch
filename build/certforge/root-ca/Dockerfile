FROM debian:bookworm-slim

# Install OpenSSL
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/certforge/root-ca

# Copy setup script and configs
COPY setup-root-ca.sh .
COPY config/ ./config/

# Copy CA directory structure
COPY . .

# Security: drop all capabilities, run as non-root
RUN useradd -r -s /bin/false certforge && \
    chown -R certforge:certforge /opt/certforge && \
    mkdir -p /opt/certforge/root-ca/private && \
    chmod 700 /opt/certforge/root-ca/private

# Switch to non-root user
USER certforge

# No entrypoint - this container is for offline key generation
# Manual execution of setup-root-ca.sh when needed

FROM python:3.12-slim

# Install OpenSSL
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/certforge/intermediate-ca

# Copy setup script and configs
COPY deploy-intermediate.sh .
COPY config/ ./config/

# Copy CA directory structure
COPY . .

# Copy Flask backend
COPY backend/ ./backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Security: drop all capabilities, run as non-root
RUN useradd -r -s /bin/false certforge && \
    chown -R certforge:certforge /opt/certforge && \
    chmod 700 /opt/certforge/intermediate-ca/private

# Switch to non-root user
USER certforge

# Expose Flask port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Run Flask application
CMD ["python", "backend/app.py"]


4. **Install Database (Optional but Recommended):** PostgreSQL is a good choice for Django.
```
apt install -y postgresql postgresql-contrib libpq-dev
# Basic Postgres setup (run as postgres user or via sudo -u postgres psql)
# sudo -u postgres psql
# CREATE DATABASE cadb;
# CREATE USER causer WITH PASSWORD 'your_strong_password';
# ALTER ROLE causer SET client_encoding TO 'utf8';
# ALTER ROLE causer SET default_transaction_isolation TO 'read committed';
# ALTER ROLE causer SET timezone TO 'UTC';
# GRANT ALL PRIVILEGES ON DATABASE cadb TO causer;
# \q
```
# Production Deployment & Operations Guide
## Premium QR Code Voting Application

This guide provides instructions for hosting the Premium QR Code Voting Application on a production Linux/Windows server with single-port HTTP/HTTPS serving and PostgreSQL.

---

## 1. Production Architecture Overview

- **Single Application Server**: Node.js & Express runs on one port (`PORT=5000` or custom port).
- **Frontend Delivery**: Express statically serves compiled assets from `frontend/dist` with client-side SPA fallback.
- **Backend APIs**: Mounted under `/api/*` on the identical host and port (no reverse proxy CORS overhead).
- **Database**: PostgreSQL 14+ with parameterized queries, schema constraints, and isolation transactions.
- **Zero Seed Data**: Tables initialize completely empty; master administrator account is established upon first visit via `/admin`.

---

## 2. Server Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
- **PostgreSQL**: v14.0 or higher
- **Process Manager**: PM2 or Systemd
- **Web Reverse Proxy (Optional for SSL)**: Nginx or Caddy

---

## 3. Environment Configuration (`.env`)

Create a `.env` file in the project root:

```env
# Server
PORT=5000
NODE_ENV=production

# Database (PostgreSQL)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=voting_app
DB_USER=postgres
DB_PASSWORD=your_strong_postgres_password
DB_SSL=false

# Security & Sessions (Generate with: openssl rand -hex 32)
JWT_SECRET=generate_a_cryptographically_secure_random_64_character_hex_string
SESSION_SECRET=generate_another_cryptographically_secure_random_64_character_hex
COOKIE_DOMAIN=
COOKIE_SECURE=true

# Public Client URL
CLIENT_URL=https://your-event-domain.com
```

---

## 4. Build & Database Migrations

```bash
# 1. Install production & build dependencies
npm ci

# 2. Run PostgreSQL migrations (Creates all 9 clean tables with zero seed data)
npm run migrate

# 3. Compile frontend React bundle into frontend/dist
npm run build
```

---

## 5. Process Management (PM2)

Using PM2 to ensure the server automatically restarts upon system reboots or unhandled errors:

```bash
# Install PM2 globally
npm install -g pm2

# Start single-port production server
pm2 start backend/src/server.js --name "voting-app" --env NODE_ENV=production

# Save process list
pm2 save
pm2 startup
```

---

## 6. Nginx HTTPS Reverse Proxy Configuration

Below is a standard Nginx configuration snippet terminating SSL and proxying traffic to the single Express application port:

```nginx
server {
    listen 80;
    server_name your-event-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-event-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-event-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-event-domain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. First-Time Administrator Setup

1. Open your browser and navigate to:
   `https://your-event-domain.com/admin`
2. The application detects that zero administrators exist and presents the **One-Time Master Setup** form.
3. Provide your name, administrative email, and strong password.
4. Once submitted:
   - The setup endpoint permanently locks at both the API and database levels.
   - Subsequent public requests to setup return `403 SETUP_LOCKED`.
   - Your session is authenticated and you are redirected to the Executive Dashboard.

---

## 8. Database Backup & Disaster Recovery

Run automated daily logical backups of PostgreSQL:

```bash
# Backup command
pg_dump -U postgres -h 127.0.0.1 -F c -b -v -f "/var/backups/voting_app_$(date +%Y%m%d_%H%M%S).dump" voting_app

# Restore command
pg_restore -U postgres -h 127.0.0.1 -d voting_app -v "/var/backups/voting_app_timestamp.dump"
```


# Deploy to AWS EC2 — With Nginx + SSL (Recommended for Self-Hosted)

This guide walks you through deploying Linguava to a single AWS EC2 instance running Ubuntu 24.04, with **Nginx as a reverse proxy** and **Let's Encrypt SSL**. Total cost: ~$5/month (t3.micro free-tier eligible).

> Prefer Vercel? See `docs/deploy-vercel.md`. Want bare Node without Nginx? See `docs/deploy-aws-ec2-no-nginx.md`.

---

## Architecture

```
Internet → AWS Security Group (443, 22)
              ↓
         EC2 Instance (Ubuntu 24.04)
              ↓
         Nginx (TLS termination, :443)
              ↓
         PM2-managed Node.js (Next.js standalone, :3000)
              ↓
         SQLite file at /var/lib/linguava/db.sqlite
              (OR Postgres on the same instance / RDS)
```

---

## Step 1 — Launch the EC2 Instance

1. AWS Console → **EC2 → Launch Instance**.
2. **Name:** `linguava-prod`
3. **AMI:** Ubuntu Server 24.04 LTS (64-bit x86)
4. **Instance type:** `t3.micro` (free tier) or `t3.small` for production traffic
5. **Key pair:** Create new — `linguava-key` — download the `.pem` file. **Keep this safe; you can't download it again.**
6. **Network settings:**
   - VPC: default
   - Auto-assign public IP: **Enable**
   - Security group: Create new — `linguava-sg` — with these inbound rules:
     | Type | Port | Source | Why |
     |---|---|---|---|
     | SSH | 22 | *My IP* (don't use 0.0.0.0/0) | Admin access |
     | HTTP | 80 | 0.0.0.0/0 | Let's Encrypt HTTP-01 challenge |
     | HTTPS | 443 | 0.0.0.0/0 | Production traffic |
7. **Storage:** 20 GB gp3 (more if you expect heavy history usage with Postgres).
8. Click **Launch instance**.

Wait ~60 seconds for it to boot. Note the **Public IPv4 DNS** (e.g., `ec2-12-34-56-78.us-east-1.compute.amazonaws.com`) — you'll need it.

---

## Step 2 — Connect & Install System Dependencies

```bash
# From your local machine
chmod 400 linguava-key.pem
ssh -i linguava-key.pem ubuntu@ec2-<your-ip>.us-east-1.compute.amazonaws.com
```

On the EC2 instance:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Bun (faster builds, matches dev env)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Nginx
sudo apt install -y nginx

# Install Certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

Verify:
```bash
node -v   # v20.x
bun -v    # v1.x
nginx -v  # nginx version: nginx/1.24.x
pm2 -v    # 5.x
```

---

## Step 3 — Clone the Repo

```bash
sudo mkdir -p /var/www/linguava
sudo chown ubuntu:ubuntu /var/www/linguava
cd /var/www/linguava

git clone https://github.com/<your-username>/linguava.git .
```

---

## Step 4 — Configure Environment

```bash
cp .env.example .env
nano .env
```

Set at minimum:
```env
DATABASE_URL=file:/var/lib/linguava/db.sqlite
NEXTAUTH_SECRET=K7x9pQ2vR8sT3uW1yZ0aB4cD6eF8gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB2cD4eF6gH8iJ0kL2mN4oP6q
NEXTAUTH_URL=https://linguava.yourdomain.com
# (Optional) Google OAuth + SMTP...
```

Generate the secret locally if you don't have one:
```bash
openssl rand -base64 32
```

Create the DB directory:
```bash
sudo mkdir -p /var/lib/linguava
sudo chown -R ubuntu:ubuntu /var/lib/linguava
```

---

## Step 5 — Install Dependencies & Build

```bash
cd /var/www/linguava
bun install
bun run db:push
bun run build
```

The build creates `.next/standalone/` (a self-contained Node server) and `.next/static/` (static assets).

---

## Step 6 — Start the App with PM2

Create a PM2 ecosystem file:

```bash
nano /var/www/linguava/ecosystem.config.cjs
```

Paste:
```js
module.exports = {
  apps: [{
    name: 'linguava',
    script: '.next/standalone/server.js',
    cwd: '/var/www/linguava',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '127.0.0.1',  // Only listen on localhost — Nginx proxies to it
    },
    instances: 1,             // Increase if you have more CPU cores
    exec_mode: 'fork',
    max_memory_restart: '512M',
    error_file: '/var/log/linguava/err.log',
    out_file: '/var/log/linguava/out.log',
    time: true,
  }],
};
```

Create log directory:
```bash
sudo mkdir -p /var/log/linguava
sudo chown -R ubuntu:ubuntu /var/log/linguava
```

Start:
```bash
cd /var/www/linguava
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
# PM2 prints a sudo command — copy and run it to enable auto-restart on reboot
```

Verify:
```bash
pm2 status
# Should show "linguava" as "online"
curl http://127.0.0.1:3000
# Should return HTML
```

---

## Step 7 — Configure Nginx

Create the Nginx config:

```bash
sudo nano /etc/nginx/sites-available/linguava
```

Paste (replace `linguava.yourdomain.com` with your actual domain, or use the EC2 public DNS for testing):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name linguava.yourdomain.com;

    # Redirect all HTTP to HTTPS (after Certbot runs, this block is auto-added)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name linguava.yourdomain.com;

    # SSL certs (will be filled in by Certbot)
    ssl_certificate /etc/letsencrypt/live/linguava.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/linguava.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.js standalone doesn't serve static files by default —
    # we copy them into .next/standalone/.next/static during build.
    location /_next/static/ {
        alias /var/www/linguava/.next/standalone/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Public assets (manifest, icons, sw.js, robots.txt)
    location /public/ {
        alias /var/www/linguava/public/;
        expires 30d;
    }
    # The build copies `public/` into `.next/standalone/public/` automatically.
    location = /manifest.json { root /var/www/linguava/.next/standalone/public/; }
    location = /sw.js { root /var/www/linguava/.next/standalone/public/; add_header Cache-Control "no-cache"; }
    location = /robots.txt { root /var/www/linguava/.next/standalone/public/; }
    location /icons/ { root /var/www/linguava/.next/standalone/public/; expires 30d; }

    # Reverse proxy to the Next.js standalone server
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    client_max_body_size 10M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/linguava /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t        # Test config
sudo systemctl reload nginx
```

---

## Step 8 — Issue the SSL Certificate

### If you have a real domain pointing to this EC2 instance:

1. At your registrar, create an **A record**: `linguava.yourdomain.com → <EC2 public IP>`.
2. Wait for DNS to propagate (check with `dig linguava.yourdomain.com +short`).
3. Run:
   ```bash
   sudo certbot --nginx -d linguava.yourdomain.com \
     --non-interactive --agree-tos -m you@yourdomain.com --redirect
   ```
4. Certbot modifies the Nginx config to point at the new certs and auto-sets up the HTTP→HTTPS redirect.

### If you're testing with the EC2 public DNS (no domain):

You can't get a Let's Encrypt cert for `*.compute.amazonaws.com`. Use self-signed for testing:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/selfsigned.key \
  -out /etc/ssl/certs/selfsigned.crt \
  -subj "/C=US/ST=NY/L=NY/O=Linguava/CN=ec2-<your-ip>.compute.amazonaws.com"
```
Then update the Nginx config to point at these certs. Browsers will warn — fine for testing, not production.

---

## Step 9 — Verify in Browser

1. Visit `https://linguava.yourdomain.com` — you should see the landing page.
2. Click **Try Demo** — translator should work.
3. Register a user — should redirect to `/dashboard`.
4. Check logs if anything fails:
   ```bash
   pm2 logs linguava --lines 50
   sudo tail -f /var/log/nginx/error.log
   ```

---

## Step 10 — Auto-Renew SSL

Certbot installs a systemd timer that auto-renews. Verify:
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## Step 11 — Auto-Deploy on Git Push (Optional)

Create a deploy script on the server:

```bash
nano /var/www/linguava/deploy.sh
```

```bash
#!/usr/bin/env bash
set -e
cd /var/www/linguava
git pull origin main
bun install --frozen-lockfile
bun run db:push
bun run build
pm2 restart linguava
echo "Deployed at $(date)" >> /var/log/linguava/deploy.log
```

```bash
chmod +x /var/www/linguava/deploy.sh
```

Now either:
- **Manual:** SSH in, run `./deploy.sh`.
- **GitHub Webhook:** Set up a webhook receiver (e.g., `webhook` package) that runs `deploy.sh` on push to `main`. See `docs/github-actions.md` for an alternative approach using Actions + SSH.

---

## Step 12 — Backups

### SQLite
```bash
# Add to /etc/cron.daily/backup-linguava
#!/usr/bin/env bash
DATE=$(date +%Y%m%d)
cp /var/lib/linguava/db.sqlite /var/backups/linguava/db-$DATE.sqlite
find /var/backups/linguava/ -mtime +30 -delete
```

### Postgres (if you switched)
```bash
pg_dump -U linguava -d linguava -F c -f /var/backups/linguava/db-$(date +%Y%m%d).dump
```

Push backups to S3 daily via `aws s3 sync` for off-instance durability.

---

## Step 13 — Monitoring

- **PM2 monitoring:** `pm2 monit` (live CPU/memory).
- **PM2 dashboard:** `pm2 install pm2-server-monit` for system metrics.
- **Log rotation:** `pm2 install pm2-logrotate` to prevent log files from filling the disk.
- **Uptime monitoring:** Use [UptimeRobot](https://uptimerobot.com) (free) to ping `https://linguava.yourdomain.com/api/health` every 5 minutes. (Add a `/api/health` route returning `{ ok: true }` if you want this — easy add.)

---

## Common Issues

### "502 Bad Gateway" from Nginx
PM2 process crashed. Check `pm2 logs linguava`. Common causes: missing env var, port already in use, build not run.

### Translations return 429
GLM-4-Flash rate limit. Either spread requests across users, upgrade to a paid model, or swap to DeepL (see `docs/architecture.md`).

### SSL cert renewal fails
Make sure ports 80 AND 443 are open in your security group. Certbot needs port 80 for the HTTP-01 challenge even though your site runs on 443.

### Database locked (SQLite)
SQLite is single-writer. If you see "SQLITE_BUSY", switch to Postgres (single-instance Postgres install is fine — `sudo apt install postgresql`).

### Disk full
Check with `df -h`. PM2 logs and `dev.log` can grow. Set up `pm2-logrotate` and add `dev.log` to logrotate.

---

## Cost Estimate (Single Instance, Light Traffic)

| Resource | Monthly Cost |
|---|---|
| EC2 t3.micro (free tier first 12 mo) | $0 → $8.47 after |
| EBS 20 GB gp3 | ~$1.60 |
| Route 53 hosted zone (optional) | $0.50 |
| Domain (optional) | $10–$15/year |
| Let's Encrypt SSL | Free |
| **Total** | **~$10/month** after free tier ends |

For heavier traffic, scale vertically (t3.small/medium) or horizontally (ALB + multiple instances + shared Postgres on RDS).

# Deploy to AWS EC2 — Without Nginx (Bare Node.js + PM2 + Caddy or Direct TLS)

This is the minimalist path: **no Nginx, no separate reverse proxy layer**. Next.js runs on port 443 directly (via PM2 + port forwarding) or behind Caddy (a single-binary, auto-HTTPS alternative to Nginx).

Use this guide when you want:
- Fewer moving parts on the server.
- The same process serving HTTP and terminating TLS.
- A 1-binary reverse-proxy alternative (Caddy) that auto-manages SSL with zero config.

---

## Option A — Direct Node.js on Port 443 (No Reverse Proxy At All)

Trade-off: **No automatic Let's Encrypt**. You must manage certs manually or use a self-signed cert. Best for internal tools or quick testing.

### Steps

Follow Steps 1–6 of `docs/deploy-aws-ec2.md` (launch EC2, install Node/Bun/PM2, clone repo, build), then:

#### 1. Allow port 443 in the EC2 security group
- AWS Console → EC2 → Security Groups → `linguava-sg` → Edit inbound rules → Add:
  - Type: HTTPS, Port: 443, Source: 0.0.0.0/0

#### 2. Generate or obtain a TLS certificate

**Self-signed (testing only):**
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/linguava.key \
  -out /etc/ssl/certs/linguava.crt \
  -subj "/C=US/ST=NY/L=NY/O=Linguava/CN=linguava.yourdomain.com"
```

**Real cert via Certbot standalone (brief downtime during renewal):**
```bash
sudo certbot certonly --standalone -d linguava.yourdomain.com \
  --non-interactive --agree-tos -m you@yourdomain.com
# Certs end up at /etc/letsencrypt/live/linguava.yourdomain.com/
```
Stop PM2 before running this (Certbot needs port 80), then restart after.

#### 3. Configure Next.js to serve HTTPS directly

Next.js standalone doesn't expose TLS options out of the box, so wrap the server in a tiny HTTPS proxy script:

```bash
nano /var/www/linguava/server-tls.js
```

```js
const { createServer } = require('https');
const { parse } = require('url');
const fs = require('fs');
const next = require('next');

const port = process.env.PORT || 443;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const options = {
  key:  fs.readFileSync('/etc/ssl/private/linguava.key'),
  cert: fs.readFileSync('/etc/ssl/certs/linguava.crt'),
};

app.prepare().then(() => {
  createServer(options, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Ready on https://0.0.0.0:${port}`);
  });
});
```

> **Important:** For production, you don't want to run `next dev` server. The script above uses `next()` which is fine for both dev and prod — just set `NODE_ENV=production`. For the **standalone** build (preferred), see Option B below which is much more efficient.

#### 4. Update PM2 ecosystem to use the TLS wrapper

```js
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'linguava',
    script: 'server-tls.js',
    cwd: '/var/www/linguava',
    env: {
      NODE_ENV: 'production',
      PORT: 443,
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
  }],
};
```

#### 5. Allow Node to bind to port 443 (privileged port)

```bash
# Option 1: Run PM2 as root (not recommended)
# Option 2: Grant CAP_NET_BIND_SERVICE to the Node binary (recommended)
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

#### 6. Start

```bash
pm2 restart ecosystem.config.cjs
curl -k https://localhost   # -k for self-signed; drop it for real cert
```

#### 7. (Optional) Redirect HTTP → HTTPS via iptables

```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 443
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

---

## Option B — Caddy as the Reverse Proxy (Recommended Nginx Alternative)

Caddy is a single-binary web server that **automatically provisions and renews Let's Encrypt certs** — zero config, zero cron jobs. If you don't want Nginx, **this is the path I recommend.**

### Steps

Follow Steps 1–6 of `docs/deploy-aws-ec2.md` (launch EC2, install Node/Bun/PM2, clone repo, build, start PM2 on `127.0.0.1:3000`), then:

#### 1. Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

#### 2. Configure Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

Replace everything with:

```caddy
linguava.yourdomain.com {
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    # Static assets — long cache
    @static path /_next/static/* /icons/* /manifest.json /robots.txt
    handle @static {
        root * /var/www/linguava/.next/standalone
        file_server
        header Cache-Control "public, max-age=31536000, immutable"
    }

    # Service worker — never cache
    @sw path /sw.js
    handle @sw {
        root * /var/www/linguava/.next/standalone
        file_server
        header Cache-Control "no-cache, no-store, must-revalidate"
    }

    # Everything else → Next.js
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

#### 3. Restart Caddy

```bash
sudo systemctl restart caddy
sudo systemctl status caddy
```

Caddy now:
1. Sees the domain in the Caddyfile.
2. Resolves DNS for `linguava.yourdomain.com` (must point to this EC2 instance's public IP).
3. Provisions a Let's Encrypt cert automatically via the HTTP-01 challenge.
4. Sets up HTTP→HTTPS redirect automatically.
5. Auto-renews the cert every 60 days (no cron, no certbot).

#### 4. Verify

```bash
curl -I https://linguava.yourdomain.com
# Should return 200 with TLS certs
```

#### 5. (Optional) Multiple sites on the same Caddy

Just add another block to the same `Caddyfile`:
```caddy
api.yourdomain.com {
    reverse_proxy 127.0.0.1:3001
}
```

---

## Option C — Pure Node.js Behind an AWS ALB (No Server-Side TLS At All)

Best when you want to scale horizontally and let AWS handle TLS.

### Architecture

```
Internet → Route 53 → AWS ALB (TLS termination, port 443)
                          ↓ (HTTP, port 80)
                EC2 Instance (Node.js on port 3000, no TLS)
```

### Steps

1. **ALB**: Create an Application Load Balancer in the same VPC as your EC2 instance.
2. **Listeners**: Add HTTPS:443 with an ACM (AWS Certificate Manager) cert for your domain. Forward to a target group on port 3000.
3. **Target Group**: Register your EC2 instance's private IP on port 3000. Health check path: `/` (returns 200).
4. **Security Group for EC2**: Allow inbound port 3000 **only from the ALB's security group** (not from 0.0.0.0/0).
5. **EC2 Node config**: Run PM2 on `0.0.0.0:3000` (no `HOSTNAME=127.0.0.1` this time — ALB needs to reach it).
6. **DNS**: Point `linguava.yourdomain.com` at the ALB's DNS name with an A-alias record.
7. **NextAuth URL**: Set `NEXTAUTH_URL=https://linguava.yourdomain.com` and ensure `X-Forwarded-Proto` is trusted (NextAuth v4 does this automatically when behind a proxy).

**Pros**: Scales horizontally (add more EC2 instances to the target group). TLS managed by AWS. No cert files on the server.

**Cons**: Higher cost (~$16/month for the ALB alone). Overkill for a single-instance app.

---

## Comparison Table

| Approach | Pros | Cons | Best For |
|---|---|---|---|
| **Nginx + Let's Encrypt** (see other doc) | Battle-tested, maximum control | Most config to write | Production single-instance |
| **Caddy** (Option B above) | Zero-config SSL, single binary | Newer ecosystem | Production single-instance, simplicity-first |
| **Direct Node + TLS** (Option A) | No reverse proxy at all | Manual cert management, no static file caching | Internal tools, quick tests |
| **ALB + Node** (Option C) | Auto-scaling, AWS-managed TLS | $16+/mo ALB cost | Multi-instance production |

---

## Common Issues (Across All No-Nginx Options)

### "Cannot bind to port 443 — permission denied"
Node can't bind to ports <1024 without elevated privileges. Either:
- Run PM2 as root (NOT recommended).
- `sudo setcap 'cap_net_bind_service=+ep' $(which node)` (recommended for Option A).
- Use a reverse proxy (Options B/C) — they run as root and bind 443, then forward to Node on a high port.

### Translations fail with 504 Gateway Timeout
The free GLM-4-Flash model can take 5+ seconds under load. Increase the proxy timeout:
- **Caddy**: `reverse_proxy 127.0.0.1:3000 { transport http { read_timeout 60s } }`
- **ALB**: Edit listener rule → "Idle timeout" → 60 seconds.

### Service worker stuck in old version
Browsers cache `sw.js` aggressively. Make sure you serve it with `Cache-Control: no-cache` (see Option B config). For Option A, you'd need to add custom headers in `server-tls.js` for `/sw.js` requests.

### "Mixed content" warnings in browser
You're serving the page over HTTPS but loading some resource over HTTP. Usually caused by `NEXTAUTH_URL` being set to `http://...`. Fix it to `https://...`.

# CareVance Deployment Guide

This project is structured as:

- `frontend/`: React + Vite web app
- `backend/`: Laravel API
- `desktop/`: Electron desktop tracker

Recommended target setup for this repo:

- Frontend on Vercel
- Backend on one AWS Lightsail Linux instance
- Database on AWS Lightsail managed PostgreSQL
- Desktop installer hosted on GitHub Releases

Why this layout fits the current codebase:

- The frontend is a static Vite app and deploys cleanly to Vercel.
- The backend stores screenshots on the filesystem, so a persistent server is simpler than fully serverless hosting.
- Idle auto-stop emails and invitation emails are queued, so the backend needs a running queue worker.
- The desktop tracker points at the deployed frontend URL with `APP_URL`.

## 1. Pre-deployment checklist

Before deploying, make sure:

- Your repo is pushed to GitHub.
- You have a Vercel account.
- You have an AWS account with Lightsail access.
- You have a domain, or are okay testing first with the default Vercel and Lightsail URLs.
- You have SMTP credentials ready if you want invitation emails and idle auto-stop emails to send.

## 2. Deploy the frontend to Vercel

This repo now includes `frontend/vercel.json` so React routes like `/dashboard`, `/reports/timeline`, and `/monitoring/screenshots` keep working on refresh.

### Vercel project setup

1. Open Vercel.
2. Import your GitHub repository.
3. When Vercel asks for the app directory, set the Root Directory to `frontend`.
4. Let Vercel detect the framework, or set:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables:
   - `VITE_API_URL=https://YOUR_BACKEND_DOMAIN/api`
   - `VITE_WEB_APP_URL=https://YOUR_FRONTEND_DOMAIN`
   - `VITE_DESKTOP_DOWNLOAD_LABEL=Download for Windows`
   - Optional: `VITE_DESKTOP_DOWNLOAD_URL=https://YOUR_BACKEND_DOMAIN/api/downloads/desktop/windows`
6. Deploy.

### What to test after Vercel deploy

Check all of these from the browser:

- Landing page loads
- `/login` loads directly
- `/signup-owner` loads directly
- `/dashboard` loads after login
- Refresh on `/reports/timeline` does not show 404
- Refresh on `/monitoring/screenshots` does not show 404

## 3. Create the Lightsail database

This Laravel app is PostgreSQL-first, so use PostgreSQL in Lightsail.

Recommended for this repo:

- Engine: PostgreSQL
- Plan: `$15/mo standard managed database`
- This plan is currently listed by AWS as eligible for the Lightsail free-tier trial for three months on select bundles.

Create it in the same AWS Region where your Lightsail instance will run.

After creation, collect:

- database host
- database name
- username
- password
- port

Keep the database private to Lightsail resources only. That is the better default for this app.

## 4. Create the Lightsail backend server

Create one Linux instance:

- Platform: Linux/Unix
- Blueprint: Ubuntu LTS
- Bundle: start with the Lightsail Linux `$5/mo` or `$7/mo` bundle if available in your trial

Attach a static IP after the instance is created.

Open firewall ports:

- `22` for SSH
- `80` for HTTP
- `443` for HTTPS

## 5. Point a backend domain to Lightsail

Example:

- frontend: `app.yourdomain.com` on Vercel
- backend: `api.yourdomain.com` on Lightsail

For Lightsail:

1. Attach a static IP to the instance.
2. Create an `A` record for `api.yourdomain.com` pointing to that static IP.

For Vercel:

1. Add `app.yourdomain.com` as a custom domain in the Vercel project.
2. Follow Vercel’s DNS instructions for the record they ask you to create.

## 6. Install runtime dependencies on the Lightsail instance

SSH into the Lightsail server and install:

- Nginx
- PHP 8.2 or newer
- Composer
- PostgreSQL client extension for PHP
- Node.js 20
- Git
- Supervisor
- Certbot

Typical Ubuntu package list:

```bash
sudo apt update
sudo apt install -y nginx git unzip supervisor certbot python3-certbot-nginx software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.3 php8.3-cli php8.3-fpm php8.3-pgsql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 7. Deploy the Laravel backend code

On the server:

```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git carevance
cd carevance/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Create writable directories:

```bash
sudo chown -R www-data:www-data /var/www/carevance/backend
sudo chmod -R 775 /var/www/carevance/backend/storage /var/www/carevance/backend/bootstrap/cache
```

## 8. Fill the production backend `.env`

Use values like these:

```env
APP_NAME="CareVance"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com
FRONTEND_APP_URL=https://app.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com

DB_CONNECTION=pgsql
DB_HOST=YOUR_LIGHTSAIL_DB_HOST
DB_PORT=5432
DB_DATABASE=YOUR_DB_NAME
DB_USERNAME=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_SSLMODE=prefer

CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
CORS_ALLOWED_ORIGIN_PATTERNS=
CORS_SUPPORTS_CREDENTIALS=false

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

API_TOKEN_TTL_MINUTES=10080
SCREENSHOT_URL_TTL_MINUTES=5

DESKTOP_WINDOWS_DOWNLOAD_URL=https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.1/CareVance-Tracker-Setup-1.0.1-x64.exe

MAIL_MAILER=smtp
MAIL_HOST=YOUR_SMTP_HOST
MAIL_PORT=587
MAIL_USERNAME=YOUR_SMTP_USERNAME
MAIL_PASSWORD=YOUR_SMTP_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@yourdomain.com
MAIL_FROM_NAME="CareVance HRMS"

PAYROLL_MODE=mock
PAYROLL_DEFAULT_CURRENCY=INR
PAYROLL_STRIPE_RETURN_URL=https://app.yourdomain.com/payroll
PAYROLL_STRIPE_SUCCESS_URL=https://app.yourdomain.com/payroll?payment=success
PAYROLL_STRIPE_CANCEL_URL=https://app.yourdomain.com/payroll?payment=cancelled
```

Then run:

```bash
php artisan config:clear
php artisan cache:clear
php artisan migrate --force
php artisan optimize
```

## 9. Configure Nginx for Laravel

Create an Nginx site pointing the web root to `backend/public`.

Example:

```nginx
server {
    server_name api.yourdomain.com;
    root /var/www/carevance/backend/public;
    index index.php index.html;

    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/carevance-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Add HTTPS to the backend

Use Certbot:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

After SSL is active, re-check:

- `https://api.yourdomain.com/`
- `https://api.yourdomain.com/api/auth/me` should return unauthenticated JSON, not HTML

## 11. Keep Laravel queue jobs running

This matters for:

- invitation emails
- idle auto-stop emails
- any queued mail/job behavior

Create a Supervisor program:

```ini
[program:carevance-queue]
command=/usr/bin/php /var/www/carevance/backend/artisan queue:work --sleep=3 --tries=1 --timeout=0
directory=/var/www/carevance/backend
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/carevance/backend/storage/logs/queue-worker.log
stopwaitsecs=3600
```

Then enable it:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start carevance-queue
sudo supervisorctl status
```

## 12. Build and publish the desktop tracker

The desktop app is what provides:

- screenshot capture
- system idle detection
- active window context

Without the desktop app, browser users will not get true desktop screenshots or system idle telemetry.

Build on Windows:

```powershell
cd desktop
npm install
$env:APP_URL="https://app.yourdomain.com"
npm run dist:win
```

This should generate installer files in `desktop/release/`.

Upload the installer to GitHub Releases, then set:

```env
DESKTOP_WINDOWS_DOWNLOAD_URL=https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.1/CareVance-Tracker-Setup-1.0.1-x64.exe
```

The frontend download buttons will then use:

- `GET /api/downloads/desktop/windows`

## 13. Point the desktop app at your deployed frontend

When testing the desktop app:

```powershell
$env:APP_URL="https://app.yourdomain.com"
npm start
```

For the packaged installer, the build now writes the target frontend URL into `desktop/app-config.json`, so the installed app can open your deployed frontend URL by default.

## 14. What must work for screenshots, idle timeout, and timeline

### Screenshots

To make screenshots work end-to-end:

- user logs in through the desktop app
- employee starts a timer
- desktop app captures screenshots every 3 minutes
- backend stores screenshots on the server filesystem
- admin or manager views them in Monitoring

This means your backend server must keep persistent storage and accept file uploads.

### Idle timeout

Idle timeout is already implemented in the desktop tracker:

- idle threshold tracking starts after 3 minutes
- timer auto-stop happens after 5 minutes
- backend can queue an idle auto-stop email

To make it fully work in production:

- desktop app must be used
- queue worker must be running
- SMTP must be configured

### Timeline and reports

Timeline data depends on activity events being created while a timer is running.

To make it work:

- employee must run the desktop app
- timer must be started
- backend API must be reachable from the frontend
- database must be healthy

## 15. Production smoke test checklist

Run these checks in order:

1. Open `https://app.yourdomain.com`
2. Open `https://api.yourdomain.com`
3. Sign up a workspace owner
4. Log in as owner
5. Create an employee
6. Install and open the desktop tracker
7. Log in as employee in the desktop app
8. Start a timer
9. Wait at least 3 to 4 minutes and confirm screenshots begin appearing
10. Stay idle for 5 minutes and confirm the timer auto-stops
11. Check Monitoring screenshots
12. Check Reports timeline
13. Send an invitation email and confirm queue delivery

## 16. Important risk to know now

The current backend stores screenshots on the local filesystem:

- `storage/app/private/screenshots`

That is okay on a single Lightsail instance, but if you later move to multiple backend servers or containers, screenshot storage should move to S3-compatible object storage.

## 17. Best first rollout

If you want the safest rollout with the least moving parts, do it in this order:

1. Deploy frontend to Vercel
2. Deploy backend to Lightsail instance
3. Create Lightsail PostgreSQL database
4. Connect frontend to backend
5. Add SMTP
6. Add queue worker
7. Build and publish desktop installer
8. Test screenshots, idle timeout, and timeline using the desktop app

## 18. Current pricing note

As checked on March 18, 2026:

- AWS lists a three-month free trial on select Lightsail bundles
- AWS lists the `$15/month` managed database plan as part of that trial offer
- After the trial, normal Lightsail charges apply

Always re-check the AWS billing page before creating resources.

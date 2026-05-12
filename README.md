# 90-Day AI Innovation Pipeline — MySQL Deployment Guide

## What's in this package

```
pipeline_db/
├── sql/
│   └── schema.sql          ← Run this first to create your DB
├── api/
│   ├── config.php          ← Edit with your DB credentials
│   ├── index.php           ← All REST API endpoints
│   └── .htaccess           ← Apache URL routing
└── pipeline.html           ← The frontend (deploy anywhere)
```

---

## Step 1 — Provision MySQL on your cloud

### DigitalOcean
1. Go to **Databases** → Create Database → MySQL 8
2. Note the **host**, **port**, **user**, **password**

### AWS RDS
1. Go to **RDS** → Create database → MySQL
2. Choose "Free tier" or your desired instance size
3. Set a master username & password
4. Note the **endpoint**, **port** (3306)

---

## Step 2 — Create the database & tables

Connect to your MySQL instance and run:

```bash
mysql -h YOUR_HOST -u YOUR_USER -p < sql/schema.sql
```

Or paste the contents of `sql/schema.sql` into phpMyAdmin / TablePlus / DBeaver.

---

## Step 3 — Configure the PHP API

Edit `api/config.php`:

```php
define('DB_HOST', 'your-db-host.example.com');
define('DB_NAME', 'pipeline_db');
define('DB_USER', 'pipeline_user');
define('DB_PASS', 'your_secure_password');

define('ALLOWED_ORIGINS', [
    'https://yourdomain.com',
]);
```

**OR** use environment variables on your server (recommended):
```bash
export DB_HOST=your-db-host.example.com
export DB_NAME=pipeline_db
export DB_USER=pipeline_user
export DB_PASS=your_secure_password
```

---

## Step 4 — Deploy the PHP API

Upload the `api/` folder to your web server.

### Option A — Apache (shared hosting / DigitalOcean Droplet)
Upload `api/` to your document root, e.g.:
```
/var/www/html/api/
```
The `.htaccess` handles routing automatically. Make sure `mod_rewrite` is enabled:
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Option B — Nginx
Use `deploy/nginx-nextchapter.conf` as a starting point. It includes:
- extensionless frontend routes, for example `/pipeline` -> `pipeline.html`
- redirects from `.html` URLs to clean URLs
- PHP API routing through `api/index.php`

Minimal API-only config:
```nginx
location /api/ {
    try_files $uri $uri/ /api/index.php?$query_string;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/api/index.php;
}
```

### Option C — cPanel / Shared Hosting
Upload the `api/` folder via File Manager or FTP to `public_html/api/`.

---

## Step 5 — Deploy the frontend

Edit `pipeline.html` line ~15:
```js
const API_BASE = '/api';  // if frontend and API are on the same domain
// OR
const API_BASE = 'https://api.yourdomain.com/api';  // different domain
```

Then serve `pipeline.html` as a static file from your web server, an S3 bucket, or Cloudflare Pages.

---

## Step 6 — Test

Open your browser and navigate to where you uploaded `pipeline.html`.

1. The login screen should appear (users are seeded from `schema.sql`)
2. Select a user and sign in
3. Navigate through phases — all data saves automatically to MySQL
4. Open a second browser tab as a different user — each user has separate pipeline data
5. Sign out works — session is deleted from the `sessions` table

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/session | Get current logged-in user |
| POST | /api/session | Login `{ user_id }` |
| DELETE | /api/session | Logout |
| GET | /api/users | List all users |
| GET | /api/modules | List the 6-module catalog and enabled modules for the current account |
| PUT | /api/modules | Owner-only module access update, constrained by plan module limit |
| GET | /api/pipeline | Load pipeline data (current user) |
| PUT | /api/pipeline | Save pipeline data (debounced, full JSON) |
| GET | /api/messages?channel=X | Get chat messages |
| POST | /api/messages | Post message `{ channel, message }` |
| GET | /api/assignments?task_id=X | Get task assignments |
| POST | /api/assignments | Assign `{ task_id, assignee_id }` |
| DELETE | /api/assignments | Remove assignment |

---

## Security checklist before going live

- [ ] Move `config.php` **above** `public_html` or use environment variables — never expose DB credentials
- [ ] Enable HTTPS (free with Let's Encrypt: `sudo certbot --apache`)
- [ ] Update `ALLOWED_ORIGINS` in `config.php` to your exact domain
- [ ] Create a **dedicated MySQL user** with only SELECT/INSERT/UPDATE/DELETE on `pipeline_db` (not root)
- [ ] Set a strong `DB_PASS`
- [ ] Consider adding rate limiting on the API (Cloudflare, nginx `limit_req`, or PHP)
- [ ] For production auth: replace demo user-select login with email + password (bcrypt) or OAuth

---

## Adding real authentication (production upgrade)

The current login is demo-mode (click a user). To add real auth:

1. Add `password_hash` column to `users` table
2. In `api/index.php`, change the `POST /session` handler to:
   - Accept `{ email, password }`
   - Look up user by email
   - Verify with `password_verify($password, $row['password_hash'])`
3. Update the login screen in `pipeline.html` to show email/password fields

---

## Requirements

- PHP 8.0+ with PDO and PDO_MySQL extensions
- MySQL 8.0+ (or MariaDB 10.5+)
- Apache with `mod_rewrite` OR Nginx with `try_files`

#!/bin/sh
set -eu

site_origin="$(printf '%s' "${VITE_WEB_APP_URL:-http://localhost:5173}" | sed 's:/*$::')"

cat > /usr/share/nginx/html/robots.txt <<EOF
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /projects
Disallow: /tasks
Disallow: /chat
Disallow: /attendance
Disallow: /edit-time
Disallow: /team
Disallow: /monitoring
Disallow: /approval-inbox
Disallow: /reports
Disallow: /invoices
Disallow: /payroll
Disallow: /user-management
Disallow: /employees
Disallow: /audit-logs
Disallow: /add-user
Disallow: /users/add-user
Disallow: /notifications
Disallow: /settings
Disallow: /legacy
Disallow: /desktop-web-dashboard
Disallow: /desktop-web-payroll
Disallow: /login
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /accept-invite/
Disallow: /signup

Sitemap: ${site_origin}/sitemap.xml
EOF

cat > /usr/share/nginx/html/sitemap.xml <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site_origin}/</loc>
  </url>
  <url>
    <loc>${site_origin}/pricing</loc>
  </url>
  <url>
    <loc>${site_origin}/contact-sales</loc>
  </url>
  <url>
    <loc>${site_origin}/support</loc>
  </url>
  <url>
    <loc>${site_origin}/privacy</loc>
  </url>
  <url>
    <loc>${site_origin}/terms</loc>
  </url>
  <url>
    <loc>${site_origin}/signup-owner</loc>
  </url>
  <url>
    <loc>${site_origin}/start-trial</loc>
  </url>
</urlset>
EOF

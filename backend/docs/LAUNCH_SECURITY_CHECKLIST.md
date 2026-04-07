# Launch Security Checklist

This checklist focuses on low-risk launch hardening already added in code plus the environment checks that still need to happen during production rollout.

## Completed In Repo

- Login, owner signup, invitation acceptance, password-reset requests, password-reset submissions, verification resends, invite validation, desktop downloads, and bug-report submissions have explicit throttle coverage.
- Password reset endpoints now exist with generic request responses so account existence is not disclosed through the forgot-password flow.
- Email verification is available for owner signup and invitation acceptance with signed verification links and a resend endpoint.
- Bug reports are validated server-side, throttled, and routed through a dedicated support flow instead of scattered placeholder handling.
- Frontend auth pages now surface clearer success and error states for password reset and email verification.
- Exception handling already remains production-safe when `APP_DEBUG=false`, so sensitive debug traces are not intentionally exposed in production mode.
- Google OAuth credentials are reserved in config and env files, but OAuth is not force-enabled.

## Manual Launch Checks

1. Set `APP_ENV=production`.
2. Set `APP_DEBUG=false`.
3. Set `APP_URL`, `FRONTEND_APP_URL`, and `FRONTEND_URL` to the real production origins.
4. Set `SESSION_SECURE_COOKIE=true` when the app is served over HTTPS.
5. Keep `SESSION_HTTP_ONLY=true` and review whether `SESSION_SAME_SITE=lax` or `strict` is the right production posture for your deployment.
6. Restrict `CORS_ALLOWED_ORIGINS` to the exact frontend origin or origins in production.
7. Remove or tighten `CORS_ALLOWED_ORIGIN_PATTERNS` if you do not need wildcard-like fallback behavior in production.
8. Set real `MAIL_*` credentials and confirm a queue worker is running so verification, invitation, password-reset, and bug-report emails are actually delivered.
9. Replace `SALES_CONTACT_EMAIL` and `SUPPORT_CONTACT_EMAIL` placeholder addresses with monitored production inboxes.
10. Rotate and securely store production secrets such as `APP_KEY`, database credentials, SMTP credentials, Stripe secrets, and any future OAuth secrets.
11. Run outstanding migrations so `password_reset_tokens` and `bug_reports` tables exist before launch.
12. Review throttle env values before go-live if your expected traffic profile differs from the defaults.
13. Confirm logs, error reporting, and queue monitoring are enabled in production.

## Intentionally Deferred

- Google OAuth sign-in is not fully enabled in the UI because production credentials, callback URLs, and rollout decisions are still manual launch work.
- Legal/compliance review is outside the scope of technical hardening and still must happen before launch.

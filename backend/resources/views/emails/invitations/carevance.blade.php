<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CareVance Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f2f8ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f2f8ff;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(148,163,184,0.2);box-shadow:0 24px 60px rgba(15,23,42,0.12);">
                    <tr>
                        <td style="padding:36px 36px 24px;background:linear-gradient(135deg,#020617 0%,#0f172a 32%,#0284c7 100%);color:#ffffff;">
                            <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;font-weight:700;color:#bae6fd;">CareVance</p>
                            <h1 style="margin:0;font-size:30px;line-height:1.15;font-weight:700;">You're invited to join CareVance</h1>
                            <p style="margin:16px 0 0;font-size:15px;line-height:1.8;color:#e2e8f0;">
                                {{ $organizationName }} has invited <strong>{{ $email }}</strong> to join as a {{ strtolower($role) }}.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 36px 12px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#475569;">
                                Use the secure invitation below to create your account. Your workspace and role are already assigned for you.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                                <tr>
                                    <td>
                                        <a
                                            href="{{ $acceptUrl }}"
                                            style="display:inline-block;padding:14px 24px;border-radius:999px;background:linear-gradient(135deg,#020617 0%,#0f172a 34%,#0284c7 100%);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;"
                                        >
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <div style="padding:18px 20px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
                                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0369a1;">Invitation details</p>
                                <p style="margin:0;font-size:14px;line-height:1.8;color:#475569;">
                                    Workspace: <strong style="color:#0f172a;">{{ $organizationName }}</strong><br>
                                    Role: <strong style="color:#0f172a;">{{ $role }}</strong><br>
                                    Expires: <strong style="color:#0f172a;">{{ optional($expiresAt)->timezone(config('app.timezone'))->format('M j, Y g:i A') }}</strong>
                                </p>
                            </div>
                            <p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#64748b;">
                                If the button does not work, paste this link into your browser:
                            </p>
                            <p style="margin:8px 0 0;word-break:break-all;font-size:13px;line-height:1.8;color:#0f172a;">
                                <a href="{{ $acceptUrl }}" style="color:#0284c7;text-decoration:none;">{{ $acceptUrl }}</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 36px 32px;">
                            <p style="margin:0;font-size:12px;line-height:1.8;color:#94a3b8;">
                                If you were not expecting this invitation, you can ignore this email or contact {{ $salesEmail }}.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

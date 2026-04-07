<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f2f8ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f2f8ff;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(148,163,184,0.2);box-shadow:0 24px 60px rgba(15,23,42,0.12);">
                    <tr>
                        <td style="padding:36px 36px 24px;background:linear-gradient(135deg,#020617 0%,#0f172a 32%,#0284c7 100%);color:#ffffff;">
                            <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;font-weight:700;color:#bae6fd;">CareVance</p>
                            <h1 style="margin:0;font-size:30px;line-height:1.15;font-weight:700;">Reset your password</h1>
                            <p style="margin:16px 0 0;font-size:15px;line-height:1.8;color:#e2e8f0;">
                                Hi {{ $name ?: 'there' }}, we received a password reset request for <strong>{{ $email }}</strong>.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 36px 12px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#475569;">
                                Use the secure link below to choose a new password.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                                <tr>
                                    <td>
                                        <a
                                            href="{{ $resetUrl }}"
                                            style="display:inline-block;padding:14px 24px;border-radius:999px;background:linear-gradient(135deg,#020617 0%,#0f172a 34%,#0284c7 100%);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;"
                                        >
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#64748b;">
                                If the button does not work, paste this link into your browser:
                            </p>
                            <p style="margin:8px 0 0;word-break:break-all;font-size:13px;line-height:1.8;color:#0f172a;">
                                <a href="{{ $resetUrl }}" style="color:#0284c7;text-decoration:none;">{{ $resetUrl }}</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 36px 32px;">
                            <p style="margin:0;font-size:12px;line-height:1.8;color:#94a3b8;">
                                If you did not request this change, you can ignore this email or contact {{ $supportEmail }}.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

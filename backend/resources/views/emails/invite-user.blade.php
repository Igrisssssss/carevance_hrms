<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CareVance HRMS Invite</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f8fafc;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 20px 45px rgba(15,23,42,0.1);">
                    <tr>
                        <td style="padding:28px 32px;background:#0f172a;color:#ffffff;">
                            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;color:#bae6fd;">CareVance HRMS</p>
                            <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;">You're invited to join {{ $companyName }}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
                                You have been invited to join CareVance HRMS. Click below to continue your signup.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
                                <tr>
                                    <td>
                                        <a
                                            href="{{ $inviteLink }}"
                                            style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0284c7;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;"
                                        >
                                            Accept Invite
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:18px 0 6px;font-size:13px;line-height:1.7;color:#64748b;">
                                If the button does not work, copy and paste this link into your browser:
                            </p>
                            <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;">
                                <a href="{{ $inviteLink }}" style="color:#0284c7;text-decoration:none;">{{ $inviteLink }}</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px 28px;">
                            <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">
                                If you were not expecting this invite, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

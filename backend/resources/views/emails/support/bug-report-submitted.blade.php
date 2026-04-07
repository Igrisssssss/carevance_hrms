<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bug report submitted</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f8fafc;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(148,163,184,0.2);box-shadow:0 24px 60px rgba(15,23,42,0.12);">
                    <tr>
                        <td style="padding:28px 32px;border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;color:#0369a1;">CareVance Support</p>
                            <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;">New bug report received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px;">
                            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#475569;">
                                Reporter: <strong style="color:#0f172a;">{{ $bugReport->name ?: 'Not provided' }}</strong><br>
                                Email: <strong style="color:#0f172a;">{{ $bugReport->email }}</strong><br>
                                Category: <strong style="color:#0f172a;">{{ $bugReport->issue_category }}</strong><br>
                                Route: <strong style="color:#0f172a;">{{ $bugReport->current_path ?: 'Not provided' }}</strong>
                            </p>
                            <div style="padding:18px 20px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
                                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0369a1;">Summary</p>
                                <p style="margin:0;font-size:14px;line-height:1.8;color:#0f172a;">{{ $bugReport->summary }}</p>
                            </div>
                            <div style="padding:18px 20px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;margin-top:16px;">
                                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0369a1;">Description</p>
                                <p style="margin:0;font-size:14px;line-height:1.8;color:#0f172a;white-space:pre-line;">{{ $bugReport->description }}</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

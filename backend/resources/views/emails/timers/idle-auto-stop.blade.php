<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timer Stopped For Inactivity</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f8fafc;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 20px 45px rgba(15,23,42,0.1);">
                    <tr>
                        <td style="padding:28px 32px;background:#0f172a;color:#ffffff;">
                            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;color:#bae6fd;">CareVance</p>
                            <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;">Your timer was stopped</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
                                Hi {{ $userName ?: 'there' }},
                            </p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
                                Your running timer in {{ $organizationName }} was stopped automatically because you were idle for {{ $idleDurationLabel }}.
                            </p>
                            <div style="padding:18px 20px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
                                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0369a1;">Auto-stop details</p>
                                <p style="margin:0;font-size:14px;line-height:1.8;color:#475569;">
                                    Idle duration: <strong style="color:#0f172a;">{{ $idleDurationLabel }}</strong><br>
                                    Stopped at: <strong style="color:#0f172a;">{{ $stoppedAt->copy()->timezone($displayTimezone)->format('M j, Y g:i A T') }}</strong>
                                </p>
                            </div>
                            <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                                You can reopen the desktop app and start the timer again when you return.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

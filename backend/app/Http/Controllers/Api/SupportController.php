<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\InteractsWithApiResponses;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Support\SubmitBugReportRequest;
use App\Mail\BugReportSubmittedMail;
use App\Models\BugReport;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SupportController extends Controller
{
    use InteractsWithApiResponses;

    public function storeBugReport(SubmitBugReportRequest $request)
    {
        $bugReport = BugReport::query()->create([
            ...$request->validated(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $supportEmail = (string) config('carevance.support_email', '');

        if ($supportEmail !== '') {
            try {
                Mail::to($supportEmail)->queue(new BugReportSubmittedMail($bugReport));
            } catch (\Throwable $exception) {
                Log::warning('Bug report notification email failed.', [
                    'bug_report_id' => $bugReport->id,
                    'email' => $supportEmail,
                    'exception' => $exception::class,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        return $this->createdResponse([
            'report_id' => $bugReport->id,
        ], 'Bug report submitted successfully.');
    }
}

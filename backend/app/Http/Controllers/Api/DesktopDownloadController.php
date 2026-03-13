<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DesktopDownloadController extends Controller
{
    public function windows(Request $request)
    {
        $downloadUrl = (string) env('DESKTOP_WINDOWS_DOWNLOAD_URL', '');
        if ($downloadUrl === '') {
            return response()->json(['message' => 'Desktop download is not configured.'], 404);
        }

        $scheme = (string) parse_url($downloadUrl, PHP_URL_SCHEME);
        if (!in_array($scheme, ['http', 'https'], true)) {
            report(new \RuntimeException('Invalid desktop download URL scheme.'));

            return response()->json(['message' => 'Desktop download is not configured correctly.'], 500);
        }

        return redirect()->away($downloadUrl);
    }
}

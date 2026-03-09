<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DesktopDownloadController extends Controller
{
    public function windows(Request $request)
    {
        $downloadUrl = (string) env('DESKTOP_WINDOWS_DOWNLOAD_URL', '');
        if ($downloadUrl === '') {
            return response()->json(['message' => 'Desktop download is not configured.'], 404);
        }

        try {
            $response = Http::withOptions(['stream' => true])
                ->timeout(300)
                ->get($downloadUrl);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'Unable to fetch desktop installer.'], 502);
        }

        if (!$response->successful()) {
            return response()->json(['message' => 'Unable to fetch desktop installer.'], 502);
        }

        $path = (string) parse_url($downloadUrl, PHP_URL_PATH);
        $filename = basename($path) ?: 'TimeTrack-Setup.exe';
        $contentType = $response->header('Content-Type') ?: 'application/octet-stream';
        $contentLength = $response->header('Content-Length');
        $stream = $response->toPsrResponse()->getBody();

        $headers = [
            'Content-Type' => $contentType,
        ];

        if ($contentLength) {
            $headers['Content-Length'] = $contentLength;
        }

        return response()->streamDownload(function () use ($stream) {
            while (!$stream->eof()) {
                echo $stream->read(1024 * 64);
            }
        }, urldecode($filename), $headers);
    }
}

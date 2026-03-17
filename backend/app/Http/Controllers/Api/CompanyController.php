<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\InteractsWithApiResponses;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    use InteractsWithApiResponses;

    public function current(Request $request)
    {
        $user = $request->user();
        $user?->load('organization');

        return $this->successResponse([
            'company' => $user?->organization,
        ]);
    }
}

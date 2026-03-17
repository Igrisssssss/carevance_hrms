<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\InteractsWithApiResponses;
use App\Http\Controllers\Controller;
use App\Services\Billing\WorkspaceBillingService;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    use InteractsWithApiResponses;

    public function __construct(private readonly WorkspaceBillingService $workspaceBillingService)
    {
    }

    public function current(Request $request)
    {
        $user = $request->user();
        $user?->load('organization');

        return $this->successResponse(
            $this->workspaceBillingService->snapshot($user?->organization) ?? ['plan' => null, 'workspace' => null]
        );
    }
}

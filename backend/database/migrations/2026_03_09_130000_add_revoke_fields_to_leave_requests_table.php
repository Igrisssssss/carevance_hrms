<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('revoke_status', 20)->nullable()->after('status');
            $table->timestamp('revoke_requested_at')->nullable()->after('revoke_status');
            $table->foreignId('revoke_reviewed_by')->nullable()->after('revoke_requested_at')->constrained('users')->nullOnDelete();
            $table->timestamp('revoke_reviewed_at')->nullable()->after('revoke_reviewed_by');
            $table->text('revoke_review_note')->nullable()->after('revoke_reviewed_at');
            $table->index(['organization_id', 'revoke_status'], 'leave_requests_org_revoke_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropIndex('leave_requests_org_revoke_status_idx');
            $table->dropConstrainedForeignId('revoke_reviewed_by');
            $table->dropColumn([
                'revoke_status',
                'revoke_requested_at',
                'revoke_reviewed_at',
                'revoke_review_note',
            ]);
        });
    }
};


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_time_edit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('attendance_date');
            $table->unsignedInteger('extra_seconds');
            $table->text('message')->nullable();
            $table->string('status', 20)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status'], 'attendance_time_edit_requests_org_status_idx');
            $table->index(['user_id', 'attendance_date'], 'attendance_time_edit_requests_user_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_time_edit_requests');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_punches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('attendance_record_id')->constrained('attendance_records')->cascadeOnDelete();
            $table->timestamp('punch_in_at');
            $table->timestamp('punch_out_at')->nullable();
            $table->unsignedInteger('worked_seconds')->default(0);
            $table->timestamps();

            $table->index(['attendance_record_id', 'punch_in_at'], 'attendance_punches_record_in_idx');
            $table->index(['user_id', 'punch_out_at'], 'attendance_punches_user_out_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_punches');
    }
};

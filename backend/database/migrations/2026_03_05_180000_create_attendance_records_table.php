<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('attendance_date');
            $table->timestamp('check_in_at')->nullable();
            $table->timestamp('check_out_at')->nullable();
            $table->unsignedInteger('worked_seconds')->default(0);
            $table->unsignedSmallInteger('late_minutes')->default(0);
            $table->string('status', 30)->default('absent');
            $table->timestamps();

            $table->unique(['user_id', 'attendance_date'], 'attendance_records_user_date_unique');
            $table->index(['organization_id', 'attendance_date'], 'attendance_records_org_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};

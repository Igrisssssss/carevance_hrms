<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_holidays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->date('holiday_date');
            $table->string('country', 64)->default('ALL');
            $table->string('title', 255);
            $table->text('details')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'holiday_date', 'country'], 'attendance_holidays_org_date_country_unique');
            $table->index(['organization_id', 'holiday_date'], 'attendance_holidays_org_date_idx');
            $table->index(['organization_id', 'country', 'holiday_date'], 'attendance_holidays_org_country_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_holidays');
    }
};

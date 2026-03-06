<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_records', 'manual_adjustment_seconds')) {
                $table->integer('manual_adjustment_seconds')->default(0)->after('worked_seconds');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            if (Schema::hasColumn('attendance_records', 'manual_adjustment_seconds')) {
                $table->dropColumn('manual_adjustment_seconds');
            }
        });
    }
};

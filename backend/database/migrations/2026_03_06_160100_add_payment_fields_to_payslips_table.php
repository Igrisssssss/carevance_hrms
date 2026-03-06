<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            if (!Schema::hasColumn('payslips', 'payment_status')) {
                $table->string('payment_status', 20)->default('pending')->after('net_salary');
            }
            if (!Schema::hasColumn('payslips', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('generated_at');
            }
            if (!Schema::hasColumn('payslips', 'paid_by')) {
                $table->foreignId('paid_by')->nullable()->after('paid_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            if (Schema::hasColumn('payslips', 'paid_by')) {
                $table->dropConstrainedForeignId('paid_by');
            }
            if (Schema::hasColumn('payslips', 'paid_at')) {
                $table->dropColumn('paid_at');
            }
            if (Schema::hasColumn('payslips', 'payment_status')) {
                $table->dropColumn('payment_status');
            }
        });
    }
};

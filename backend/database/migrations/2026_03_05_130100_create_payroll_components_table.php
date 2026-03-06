<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_allowances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_structure_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('calculation_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('amount', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('payroll_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_structure_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('calculation_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('amount', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_deductions');
        Schema::dropIfExists('payroll_allowances');
    }
};

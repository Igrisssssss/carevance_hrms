<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 80);
            $table->enum('category', ['basic', 'allowance', 'overtime', 'bonus', 'reimbursement', 'penalty', 'tax', 'deduction', 'other']);
            $table->enum('value_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('default_value', 12, 2)->default(0);
            $table->boolean('is_taxable')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'code'], 'salary_components_org_code_unique');
            $table->index(['organization_id', 'category'], 'salary_components_org_category_idx');
        });

        Schema::create('salary_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('currency', 8)->default('INR');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'name'], 'salary_templates_org_name_unique');
        });

        Schema::create('salary_template_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('salary_component_id')->constrained()->cascadeOnDelete();
            $table->enum('value_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('value', 12, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['salary_template_id', 'salary_component_id'], 'salary_template_component_unique');
        });

        Schema::create('payroll_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('salary_template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('currency', 8)->default('INR');
            $table->string('payout_method', 32)->default('mock');
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_ifsc_swift')->nullable();
            $table->string('payment_email')->nullable();
            $table->string('tax_identifier')->nullable();
            $table->boolean('payroll_eligible')->default(true);
            $table->boolean('reimbursements_eligible')->default(true);
            $table->boolean('is_active')->default(true);
            $table->json('earning_components')->nullable();
            $table->json('deduction_components')->nullable();
            $table->decimal('bonus_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id'], 'payroll_profiles_org_user_unique');
        });

        Schema::create('employee_salary_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('salary_template_id')->constrained()->cascadeOnDelete();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'user_id', 'effective_from'], 'employee_salary_assignments_org_user_effective_idx');
        });

        Schema::create('pay_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('run_code', 80);
            $table->string('payroll_month', 7);
            $table->string('status', 32)->default('draft');
            $table->string('currency', 8)->default('INR');
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->json('summary')->nullable();
            $table->json('warnings')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'run_code'], 'pay_runs_org_code_unique');
            $table->index(['organization_id', 'payroll_month'], 'pay_runs_org_month_idx');
        });

        Schema::create('pay_run_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pay_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payroll_id')->nullable()->constrained('payrolls')->nullOnDelete();
            $table->foreignId('payroll_profile_id')->nullable()->constrained('payroll_profiles')->nullOnDelete();
            $table->decimal('payable_days', 8, 2)->default(0);
            $table->integer('worked_seconds')->default(0);
            $table->integer('overtime_seconds')->default(0);
            $table->integer('approved_leave_days')->default(0);
            $table->integer('approved_time_edit_seconds')->default(0);
            $table->decimal('gross_pay', 12, 2)->default(0);
            $table->decimal('total_deductions', 12, 2)->default(0);
            $table->decimal('net_pay', 12, 2)->default(0);
            $table->string('status', 32)->default('draft');
            $table->string('payout_status', 32)->default('pending');
            $table->json('salary_breakdown')->nullable();
            $table->json('attendance_summary')->nullable();
            $table->json('warnings')->nullable();
            $table->timestamps();

            $table->unique(['pay_run_id', 'user_id'], 'pay_run_items_run_user_unique');
        });

        Schema::create('reimbursements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('expense_date')->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 8)->default('INR');
            $table->string('status', 32)->default('draft');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status'], 'reimbursements_org_status_idx');
        });

        Schema::create('payroll_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payroll_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('reimbursement_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('kind', ['reimbursement', 'bonus', 'manual_deduction', 'penalty', 'one_time_adjustment']);
            $table->string('effective_month', 7);
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 8)->default('INR');
            $table->string('status', 32)->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->text('approval_note')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'effective_month', 'status'], 'payroll_adjustments_org_month_status_idx');
        });

        Schema::create('payroll_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->json('payroll_calendar')->nullable();
            $table->json('default_payout_method')->nullable();
            $table->json('overtime_rules')->nullable();
            $table->json('late_deduction_rules')->nullable();
            $table->json('leave_mapping')->nullable();
            $table->json('approval_workflow')->nullable();
            $table->json('payslip_branding')->nullable();
            $table->timestamps();

            $table->unique('organization_id');
        });

        Schema::create('payroll_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 120);
            $table->string('target_type', 120)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'action'], 'payroll_audit_logs_org_action_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_audit_logs');
        Schema::dropIfExists('payroll_settings');
        Schema::dropIfExists('reimbursements');
        Schema::dropIfExists('payroll_adjustments');
        Schema::dropIfExists('pay_run_items');
        Schema::dropIfExists('pay_runs');
        Schema::dropIfExists('employee_salary_assignments');
        Schema::dropIfExists('payroll_profiles');
        Schema::dropIfExists('salary_template_components');
        Schema::dropIfExists('salary_templates');
        Schema::dropIfExists('salary_components');
    }
};

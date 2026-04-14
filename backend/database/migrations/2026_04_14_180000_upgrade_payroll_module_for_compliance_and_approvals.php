<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_profiles', function (Blueprint $table) {
            $table->string('payroll_code', 80)->nullable()->after('user_id');
            $table->string('pay_group', 120)->nullable()->after('currency');
            $table->string('tax_regime', 32)->nullable()->after('tax_identifier');
            $table->string('pan_or_tax_id', 80)->nullable()->after('tax_regime');
            $table->string('pf_account_number', 120)->nullable()->after('pan_or_tax_id');
            $table->string('uan', 120)->nullable()->after('pf_account_number');
            $table->string('esi_number', 120)->nullable()->after('uan');
            $table->string('professional_tax_state', 120)->nullable()->after('esi_number');
            $table->string('professional_tax_jurisdiction', 120)->nullable()->after('professional_tax_state');
            $table->date('payroll_start_date')->nullable()->after('professional_tax_jurisdiction');
            $table->string('bank_verification_status', 32)->default('pending')->after('payment_email');
            $table->string('declaration_status', 32)->default('not_started')->after('bank_verification_status');
            $table->string('payout_readiness_status', 32)->default('pending')->after('declaration_status');
            $table->string('compliance_readiness_status', 32)->default('pending')->after('payout_readiness_status');
            $table->json('compliance_overrides')->nullable()->after('tax_amount');
            $table->json('declaration_snapshot')->nullable()->after('compliance_overrides');

            $table->index(['organization_id', 'pay_group'], 'payroll_profiles_org_pay_group_idx');
            $table->index(['organization_id', 'payroll_code'], 'payroll_profiles_org_payroll_code_idx');
        });

        Schema::table('salary_components', function (Blueprint $table) {
            $table->string('impact', 32)->default('earning')->after('category');
            $table->string('calculation_basis', 32)->nullable()->after('value_type');
            $table->boolean('is_compliance_component')->default(false)->after('is_taxable');
            $table->boolean('is_system_default')->default(false)->after('is_compliance_component');
        });

        Schema::table('pay_runs', function (Blueprint $table) {
            $table->foreignId('validated_by')->nullable()->after('approved_by')->constrained('users')->nullOnDelete();
            $table->foreignId('manager_approved_by')->nullable()->after('validated_by')->constrained('users')->nullOnDelete();
            $table->foreignId('finance_approved_by')->nullable()->after('manager_approved_by')->constrained('users')->nullOnDelete();
            $table->foreignId('processed_by')->nullable()->after('finance_approved_by')->constrained('users')->nullOnDelete();
            $table->foreignId('paid_by')->nullable()->after('processed_by')->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable()->after('generated_at');
            $table->timestamp('manager_approved_at')->nullable()->after('approved_at');
            $table->timestamp('finance_approved_at')->nullable()->after('manager_approved_at');
            $table->timestamp('processed_at')->nullable()->after('locked_at');
            $table->timestamp('paid_at')->nullable()->after('processed_at');
            $table->json('approval_config')->nullable()->after('warnings');
            $table->json('approval_summary')->nullable()->after('approval_config');
        });

        Schema::create('pay_run_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pay_run_id')->constrained()->cascadeOnDelete();
            $table->string('stage', 40);
            $table->string('status', 32)->default('pending');
            $table->foreignId('action_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('action_at')->nullable();
            $table->text('comment')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'pay_run_id', 'stage'], 'pay_run_approvals_org_run_stage_idx');
        });

        Schema::table('pay_run_items', function (Blueprint $table) {
            $table->json('adjustment_breakdown')->nullable()->after('salary_breakdown');
            $table->json('compliance_breakdown')->nullable()->after('adjustment_breakdown');
        });

        Schema::table('payroll_adjustments', function (Blueprint $table) {
            $table->string('source', 80)->nullable()->after('kind');
            $table->foreignId('applied_run_id')->nullable()->after('approved_by')->constrained('pay_runs')->nullOnDelete();
            $table->foreignId('applied_by')->nullable()->after('applied_run_id')->constrained('users')->nullOnDelete();
            $table->foreignId('rejected_by')->nullable()->after('applied_by')->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->text('rejection_reason')->nullable()->after('approval_note');
            $table->json('attachment_meta')->nullable()->after('rejection_reason');
            $table->json('approval_trail')->nullable()->after('attachment_meta');
            $table->string('claim_reference', 120)->nullable()->after('approval_trail');
            $table->string('claim_category', 120)->nullable()->after('claim_reference');
            $table->string('merchant_name', 255)->nullable()->after('claim_category');
        });

        Schema::table('payroll_settings', function (Blueprint $table) {
            $table->json('adjustment_rules')->nullable()->after('leave_mapping');
            $table->json('compliance_settings')->nullable()->after('approval_workflow');
            $table->json('tax_settings')->nullable()->after('compliance_settings');
            $table->json('payslip_issue_rules')->nullable()->after('payslip_branding');
            $table->json('payout_workflow')->nullable()->after('payslip_issue_rules');
        });

        Schema::create('payroll_tax_declarations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payroll_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->string('financial_year', 20);
            $table->string('tax_regime', 32)->default('new');
            $table->string('status', 32)->default('draft');
            $table->json('sections')->nullable();
            $table->json('summary')->nullable();
            $table->json('approved_snapshot')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id', 'financial_year'], 'payroll_tax_declarations_org_user_fy_unique');
            $table->index(['organization_id', 'status'], 'payroll_tax_declarations_org_status_idx');
        });

        Schema::table('payrolls', function (Blueprint $table) {
            $table->decimal('gross_salary', 12, 2)->default(0)->after('tax');
            $table->json('attendance_summary')->nullable()->after('net_salary');
            $table->json('salary_breakdown')->nullable()->after('attendance_summary');
            $table->json('adjustment_breakdown')->nullable()->after('salary_breakdown');
            $table->json('compliance_breakdown')->nullable()->after('adjustment_breakdown');
            $table->json('tax_breakdown')->nullable()->after('compliance_breakdown');
            $table->json('warnings')->nullable()->after('tax_breakdown');
            $table->string('payment_reference', 191)->nullable()->after('paid_at');
            $table->text('failure_reason')->nullable()->after('payment_reference');
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->foreignId('payroll_id')->nullable()->after('payroll_structure_id')->constrained('payrolls')->nullOnDelete();
            $table->foreignId('pay_run_id')->nullable()->after('payroll_id')->constrained('pay_runs')->nullOnDelete();
            $table->string('publish_status', 32)->default('published')->after('payment_status');
            $table->timestamp('issued_at')->nullable()->after('generated_at');
            $table->timestamp('published_at')->nullable()->after('issued_at');
            $table->timestamp('unpublished_at')->nullable()->after('published_at');
            $table->timestamp('viewed_at')->nullable()->after('unpublished_at');
            $table->json('breakdown')->nullable()->after('deductions');
            $table->json('compliance_breakdown')->nullable()->after('breakdown');
            $table->string('payment_reference', 191)->nullable()->after('paid_by');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payroll_id');
            $table->dropConstrainedForeignId('pay_run_id');
            $table->dropColumn([
                'publish_status',
                'issued_at',
                'published_at',
                'unpublished_at',
                'viewed_at',
                'breakdown',
                'compliance_breakdown',
                'payment_reference',
            ]);
        });

        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'gross_salary',
                'attendance_summary',
                'salary_breakdown',
                'adjustment_breakdown',
                'compliance_breakdown',
                'tax_breakdown',
                'warnings',
                'payment_reference',
                'failure_reason',
            ]);
        });

        Schema::dropIfExists('payroll_tax_declarations');

        Schema::table('payroll_settings', function (Blueprint $table) {
            $table->dropColumn([
                'adjustment_rules',
                'compliance_settings',
                'tax_settings',
                'payslip_issue_rules',
                'payout_workflow',
            ]);
        });

        Schema::table('payroll_adjustments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('applied_run_id');
            $table->dropConstrainedForeignId('applied_by');
            $table->dropConstrainedForeignId('rejected_by');
            $table->dropColumn([
                'source',
                'rejected_at',
                'rejection_reason',
                'attachment_meta',
                'approval_trail',
                'claim_reference',
                'claim_category',
                'merchant_name',
            ]);
        });

        Schema::table('pay_run_items', function (Blueprint $table) {
            $table->dropColumn([
                'adjustment_breakdown',
                'compliance_breakdown',
            ]);
        });

        Schema::dropIfExists('pay_run_approvals');

        Schema::table('pay_runs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('validated_by');
            $table->dropConstrainedForeignId('manager_approved_by');
            $table->dropConstrainedForeignId('finance_approved_by');
            $table->dropConstrainedForeignId('processed_by');
            $table->dropConstrainedForeignId('paid_by');
            $table->dropColumn([
                'validated_at',
                'manager_approved_at',
                'finance_approved_at',
                'processed_at',
                'paid_at',
                'approval_config',
                'approval_summary',
            ]);
        });

        Schema::table('salary_components', function (Blueprint $table) {
            $table->dropColumn([
                'impact',
                'calculation_basis',
                'is_compliance_component',
                'is_system_default',
            ]);
        });

        Schema::table('payroll_profiles', function (Blueprint $table) {
            $table->dropIndex('payroll_profiles_org_pay_group_idx');
            $table->dropIndex('payroll_profiles_org_payroll_code_idx');
            $table->dropColumn([
                'payroll_code',
                'pay_group',
                'tax_regime',
                'pan_or_tax_id',
                'pf_account_number',
                'uan',
                'esi_number',
                'professional_tax_state',
                'professional_tax_jurisdiction',
                'payroll_start_date',
                'bank_verification_status',
                'declaration_status',
                'payout_readiness_status',
                'compliance_readiness_status',
                'compliance_overrides',
                'declaration_snapshot',
            ]);
        });
    }
};

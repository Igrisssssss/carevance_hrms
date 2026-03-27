<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('display_name')->nullable();
            $table->string('gender', 32)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('phone', 64)->nullable();
            $table->string('personal_email')->nullable();
            $table->text('address_line')->nullable();
            $table->string('city', 120)->nullable();
            $table->string('state', 120)->nullable();
            $table->string('postal_code', 32)->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_number', 64)->nullable();
            $table->string('emergency_contact_relationship', 120)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id'], 'employee_profiles_org_user_unique');
        });

        Schema::create('employee_work_infos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('employee_code', 80)->nullable();
            $table->foreignId('report_group_id')->nullable()->constrained('report_groups')->nullOnDelete();
            $table->string('designation')->nullable();
            $table->foreignId('reporting_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('work_location')->nullable();
            $table->string('shift_name', 120)->nullable();
            $table->string('attendance_policy', 120)->nullable();
            $table->string('employment_type', 80)->nullable();
            $table->date('joining_date')->nullable();
            $table->string('probation_status', 80)->nullable();
            $table->string('employment_status', 32)->default('active');
            $table->date('exit_date')->nullable();
            $table->string('work_mode', 32)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id'], 'employee_work_infos_org_user_unique');
            $table->unique(['organization_id', 'employee_code'], 'employee_work_infos_org_code_unique');
        });

        Schema::create('employee_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('category', 80)->default('other');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('file_disk', 64)->default('public');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('uploaded_at')->nullable();
            $table->string('review_status', 32)->default('pending');
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'user_id', 'category'], 'employee_documents_org_user_category_idx');
        });

        Schema::create('employee_government_ids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('id_type', 80);
            $table->string('id_number', 255);
            $table->string('status', 32)->default('pending');
            $table->date('issue_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('employee_document_id')->nullable()->constrained('employee_documents')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'user_id', 'id_type'], 'employee_government_ids_org_user_type_idx');
        });

        Schema::create('employee_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('account_holder_name')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_swift', 120)->nullable();
            $table->string('branch')->nullable();
            $table->string('account_type', 80)->nullable();
            $table->string('upi_id')->nullable();
            $table->string('payment_email')->nullable();
            $table->string('payout_method', 32)->default('bank_transfer');
            $table->boolean('is_default')->default(true);
            $table->string('verification_status', 32)->default('unverified');
            $table->foreignId('employee_document_id')->nullable()->constrained('employee_documents')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'user_id', 'is_default'], 'employee_bank_accounts_org_user_default_idx');
        });

        Schema::create('employee_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 120);
            $table->string('description', 255);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'user_id', 'created_at'], 'employee_activity_logs_org_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_activity_logs');
        Schema::dropIfExists('employee_bank_accounts');
        Schema::dropIfExists('employee_government_ids');
        Schema::dropIfExists('employee_documents');
        Schema::dropIfExists('employee_work_infos');
        Schema::dropIfExists('employee_profiles');
    }
};

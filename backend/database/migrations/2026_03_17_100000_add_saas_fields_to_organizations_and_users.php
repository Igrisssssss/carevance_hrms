<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('organizations')) {
            Schema::table('organizations', function (Blueprint $table) {
                if (Schema::hasColumn('organizations', 'subscription_status')) {
                    $table->string('subscription_status')->default('trial')->change();
                }

                if (!Schema::hasColumn('organizations', 'owner_user_id')) {
                    $table->foreignId('owner_user_id')
                        ->nullable()
                        ->after('id')
                        ->constrained('users')
                        ->nullOnDelete();
                }

                if (!Schema::hasColumn('organizations', 'plan_code')) {
                    $table->string('plan_code')->default('starter')->after('slug');
                }

                if (!Schema::hasColumn('organizations', 'billing_cycle')) {
                    $table->string('billing_cycle')->nullable()->after('plan_code');
                }

                if (!Schema::hasColumn('organizations', 'subscription_intent')) {
                    $table->string('subscription_intent')->default('trial')->after('subscription_status');
                }

                if (!Schema::hasColumn('organizations', 'trial_starts_at')) {
                    $table->timestamp('trial_starts_at')->nullable()->after('subscription_intent');
                }

                if (!Schema::hasColumn('organizations', 'trial_ends_at')) {
                    $table->timestamp('trial_ends_at')->nullable()->after('trial_starts_at');
                }
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'role')) {
                    $table->string('role')->default('employee')->change();
                }

                if (!Schema::hasColumn('users', 'invited_by')) {
                    $table->foreignId('invited_by')
                        ->nullable()
                        ->after('organization_id')
                        ->constrained('users')
                        ->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'invited_by')) {
                    $table->dropConstrainedForeignId('invited_by');
                }
            });
        }

        if (Schema::hasTable('organizations')) {
            Schema::table('organizations', function (Blueprint $table) {
                if (Schema::hasColumn('organizations', 'owner_user_id')) {
                    $table->dropConstrainedForeignId('owner_user_id');
                }
                if (Schema::hasColumn('organizations', 'plan_code')) {
                    $table->dropColumn('plan_code');
                }
                if (Schema::hasColumn('organizations', 'billing_cycle')) {
                    $table->dropColumn('billing_cycle');
                }
                if (Schema::hasColumn('organizations', 'subscription_intent')) {
                    $table->dropColumn('subscription_intent');
                }
                if (Schema::hasColumn('organizations', 'trial_starts_at')) {
                    $table->dropColumn('trial_starts_at');
                }
                if (Schema::hasColumn('organizations', 'trial_ends_at')) {
                    $table->dropColumn('trial_ends_at');
                }
            });
        }
    }
};

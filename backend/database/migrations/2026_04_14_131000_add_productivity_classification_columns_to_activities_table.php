<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->string('normalized_label')->nullable()->after('recorded_at');
            $table->string('normalized_domain')->nullable()->after('normalized_label');
            $table->string('software_name')->nullable()->after('normalized_domain');
            $table->string('tool_type', 40)->nullable()->after('software_name');
            $table->string('classification', 40)->nullable()->after('tool_type');
            $table->string('classification_reason')->nullable()->after('classification');
            $table->timestamp('classified_at')->nullable()->after('classification_reason');
            $table->string('classifier_version', 80)->nullable()->after('classified_at');

            $table->index(['user_id', 'classification']);
            $table->index(['user_id', 'tool_type']);
            $table->index(['normalized_domain']);
            $table->index(['software_name']);
            $table->index(['classified_at']);
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'classification']);
            $table->dropIndex(['user_id', 'tool_type']);
            $table->dropIndex(['normalized_domain']);
            $table->dropIndex(['software_name']);
            $table->dropIndex(['classified_at']);
            $table->dropColumn([
                'normalized_label',
                'normalized_domain',
                'software_name',
                'tool_type',
                'classification',
                'classification_reason',
                'classified_at',
                'classifier_version',
            ]);
        });
    }
};

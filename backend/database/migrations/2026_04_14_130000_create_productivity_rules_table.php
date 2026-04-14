<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productivity_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->string('name')->nullable();
            $table->string('target_type', 40);
            $table->string('match_mode', 40);
            $table->string('target_value');
            $table->string('classification', 40);
            $table->unsignedInteger('priority')->default(100);
            $table->string('scope_type', 40)->default('global');
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'is_active']);
            $table->index(['scope_type', 'scope_id', 'priority']);
            $table->index(['target_type', 'match_mode']);
            $table->index(['classification', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productivity_rules');
    }
};

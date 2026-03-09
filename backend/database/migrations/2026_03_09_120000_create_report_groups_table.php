<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
            $table->unique(['organization_id', 'name']);
        });

        Schema::create('report_group_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_group_id')->constrained('report_groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['report_group_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_group_user');
        Schema::dropIfExists('report_groups');
    }
};


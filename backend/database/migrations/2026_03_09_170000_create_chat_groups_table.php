<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->index(['organization_id', 'updated_at'], 'chat_groups_org_updated_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_groups');
    }
};

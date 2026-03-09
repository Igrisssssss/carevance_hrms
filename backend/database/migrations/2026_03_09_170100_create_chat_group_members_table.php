<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('chat_groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();

            $table->unique(['group_id', 'user_id'], 'chat_group_members_group_user_unique');
            $table->index(['user_id', 'group_id'], 'chat_group_members_user_group_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_group_members');
    }
};

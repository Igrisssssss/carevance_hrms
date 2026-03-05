<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_typing_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('typing_until');
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id'], 'chat_typing_unique');
            $table->index(['conversation_id', 'typing_until'], 'chat_typing_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_typing_statuses');
    }
};

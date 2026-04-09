<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_message_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('chat_messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('emoji', 16);
            $table->timestamps();

            $table->unique(['message_id', 'user_id', 'emoji'], 'chat_message_reactions_unique');
            $table->index(['message_id', 'emoji'], 'chat_message_reactions_message_emoji_idx');
        });

        Schema::create('chat_group_message_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_message_id')->constrained('chat_group_messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('emoji', 16);
            $table->timestamps();

            $table->unique(['group_message_id', 'user_id', 'emoji'], 'chat_group_message_reactions_unique');
            $table->index(['group_message_id', 'emoji'], 'chat_group_message_reactions_message_emoji_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_group_message_reactions');
        Schema::dropIfExists('chat_message_reactions');
    }
};

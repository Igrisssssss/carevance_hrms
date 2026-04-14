<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('chat_messages', 'edited_at')) {
                $table->timestamp('edited_at')->nullable()->after('body');
            }
        });

        Schema::table('chat_group_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('chat_group_messages', 'edited_at')) {
                $table->timestamp('edited_at')->nullable()->after('body');
            }
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            if (Schema::hasColumn('chat_messages', 'edited_at')) {
                $table->dropColumn('edited_at');
            }
        });

        Schema::table('chat_group_messages', function (Blueprint $table) {
            if (Schema::hasColumn('chat_group_messages', 'edited_at')) {
                $table->dropColumn('edited_at');
            }
        });
    }
};

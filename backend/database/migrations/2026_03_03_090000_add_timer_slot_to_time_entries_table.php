<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('time_entries')) {
            return;
        }

        Schema::table('time_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('time_entries', 'timer_slot')) {
                $table->string('timer_slot', 20)->default('primary')->after('user_id');
                $table->index(['user_id', 'timer_slot', 'end_time'], 'time_entries_user_slot_end_idx');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('time_entries')) {
            return;
        }

        Schema::table('time_entries', function (Blueprint $table) {
            if (Schema::hasColumn('time_entries', 'timer_slot')) {
                $table->dropIndex('time_entries_user_slot_end_idx');
                $table->dropColumn('timer_slot');
            }
        });
    }
};

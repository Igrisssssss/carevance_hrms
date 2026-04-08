<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->index(['assignee_id', 'status'], 'tasks_assignee_id_status_index');
            $table->index(['group_id', 'status'], 'tasks_group_id_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_assignee_id_status_index');
            $table->dropIndex('tasks_group_id_status_index');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('tasks', 'group_id')) {
                $table->foreignId('group_id')
                    ->nullable()
                    ->after('project_id')
                    ->constrained('groups')
                    ->nullOnDelete();
            }
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->change();
        });

        $tasks = DB::table('tasks')
            ->select('id', 'assignee_id')
            ->whereNull('group_id')
            ->whereNotNull('assignee_id')
            ->orderBy('id')
            ->get();

        foreach ($tasks as $task) {
            $groupId = null;

            if (Schema::hasTable('employee_work_infos')) {
                $groupId = DB::table('employee_work_infos')
                    ->where('user_id', $task->assignee_id)
                    ->value('report_group_id');
            }

            if (!$groupId && Schema::hasTable('group_user')) {
                $groupId = DB::table('group_user')
                    ->where('user_id', $task->assignee_id)
                    ->orderBy('id')
                    ->value('group_id');
            }

            if ($groupId) {
                DB::table('tasks')
                    ->where('id', $task->id)
                    ->update(['group_id' => $groupId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            if (Schema::hasColumn('tasks', 'group_id')) {
                $table->dropConstrainedForeignId('group_id');
            }
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable(false)->change();
        });
    }
};

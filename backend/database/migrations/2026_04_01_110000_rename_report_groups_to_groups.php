<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('report_groups') && !Schema::hasTable('groups')) {
            Schema::rename('report_groups', 'groups');
        }

        if (Schema::hasTable('report_group_user') && !Schema::hasTable('group_user')) {
            Schema::rename('report_group_user', 'group_user');
        }

        if (Schema::hasTable('group_user') && Schema::hasColumn('group_user', 'report_group_id') && !Schema::hasColumn('group_user', 'group_id')) {
            Schema::table('group_user', function (Blueprint $table) {
                $table->renameColumn('report_group_id', 'group_id');
            });
        }

        if (!Schema::hasTable('groups')) {
            return;
        }

        Schema::table('groups', function (Blueprint $table) {
            if (!Schema::hasColumn('groups', 'slug')) {
                $table->string('slug')->nullable()->after('name');
            }

            if (!Schema::hasColumn('groups', 'description')) {
                $table->text('description')->nullable()->after('slug');
            }

            if (!Schema::hasColumn('groups', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('description');
            }
        });

        $reservedSlugs = [];
        $groups = DB::table('groups')
            ->select('id', 'organization_id', 'name', 'slug')
            ->orderBy('organization_id')
            ->orderBy('id')
            ->get();

        foreach ($groups as $group) {
            $organizationId = (int) $group->organization_id;
            $existing = $reservedSlugs[$organizationId] ?? [];
            $baseSlug = Str::slug((string) $group->name) ?: 'group';
            $slug = $group->slug ? Str::slug((string) $group->slug) : $baseSlug;
            $suffix = 2;

            while (in_array($slug, $existing, true)) {
                $slug = sprintf('%s-%d', $baseSlug, $suffix);
                $suffix++;
            }

            $reservedSlugs[$organizationId][] = $slug;

            DB::table('groups')
                ->where('id', $group->id)
                ->update([
                    'slug' => $slug,
                    'is_active' => true,
                ]);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('groups')) {
            return;
        }

        Schema::table('groups', function (Blueprint $table) {
            if (Schema::hasColumn('groups', 'is_active')) {
                $table->dropColumn('is_active');
            }

            if (Schema::hasColumn('groups', 'description')) {
                $table->dropColumn('description');
            }

            if (Schema::hasColumn('groups', 'slug')) {
                $table->dropColumn('slug');
            }
        });

        if (Schema::hasTable('group_user') && Schema::hasColumn('group_user', 'group_id') && !Schema::hasColumn('group_user', 'report_group_id')) {
            Schema::table('group_user', function (Blueprint $table) {
                $table->renameColumn('group_id', 'report_group_id');
            });
        }

        if (Schema::hasTable('group_user') && !Schema::hasTable('report_group_user')) {
            Schema::rename('group_user', 'report_group_user');
        }

        if (Schema::hasTable('groups') && !Schema::hasTable('report_groups')) {
            Schema::rename('groups', 'report_groups');
        }
    }
};

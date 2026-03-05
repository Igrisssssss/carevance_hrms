<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('organizations')) {
            Schema::create('organizations', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->json('settings')->nullable();
                $table->enum('subscription_status', ['trial', 'active', 'cancelled', 'expired'])->default('trial');
                $table->date('subscription_expires_at')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('organizations', function (Blueprint $table) {
                if (!Schema::hasColumn('organizations', 'slug')) {
                    $table->string('slug')->nullable();
                }
                if (!Schema::hasColumn('organizations', 'settings')) {
                    $table->json('settings')->nullable();
                }
                if (!Schema::hasColumn('organizations', 'subscription_status')) {
                    $table->string('subscription_status')->default('trial');
                }
                if (!Schema::hasColumn('organizations', 'subscription_expires_at')) {
                    $table->date('subscription_expires_at')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('rego', 20);
            $table->string('service_bay');
            // Stored as UTC "Y-m-d H:i:s" text on SQLite, so lexical and chronological order match.
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status', 20)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Conflict check: equality on bay, range on starts_at, then ends_at/status filtered from the index.
            $table->index(['service_bay', 'starts_at', 'ends_at', 'status'], 'bookings_conflict_index');
            // List query: optional status filter, ordered by starts_at desc, id desc.
            $table->index(['starts_at', 'id'], 'bookings_list_index');
            $table->index(['status', 'starts_at', 'id'], 'bookings_status_list_index');
        });

        Schema::create('service_bay_locks', function (Blueprint $table) {
            $table->string('service_bay')->primary();
            $table->timestamp('locked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_bay_locks');
        Schema::dropIfExists('bookings');
    }
};

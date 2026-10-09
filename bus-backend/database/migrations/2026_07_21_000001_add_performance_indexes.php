<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->index(['school_id', 'role', 'status'], 'users_school_role_status_idx');
            $table->index(['school_id', 'name'], 'users_school_name_idx');
            $table->index(['school_id', 'cin'], 'users_school_cin_idx');
        });

        Schema::table('buses', function (Blueprint $table): void {
            $table->index(['school_id', 'bus_name'], 'buses_school_name_idx');
            $table->index(['school_id', 'trip_status'], 'buses_school_trip_status_idx');
            $table->index(['school_id', 'driver_id'], 'buses_school_driver_idx');
        });

        Schema::table('students', function (Blueprint $table): void {
            $table->index(['school_id', 'full_name'], 'students_school_full_name_idx');
            $table->index(['school_id', 'bus_id'], 'students_school_bus_idx');
            $table->index(['school_id', 'parent_id'], 'students_school_parent_idx');
            $table->index(['school_id', 'status'], 'students_school_status_idx');
            $table->index(['school_id', 'reg_code'], 'students_school_reg_code_idx');
        });

        Schema::table('trips', function (Blueprint $table): void {
            $table->index(['school_id', 'trip_date', 'status'], 'trips_school_date_status_idx');
            $table->index(['school_id', 'bus_id', 'trip_date'], 'trips_school_bus_date_idx');
            $table->index(['school_id', 'driver_id', 'status'], 'trips_school_driver_status_idx');
            $table->index(['bus_id', 'status', 'trip_date'], 'trips_bus_status_date_idx');
            $table->index(['driver_id', 'status'], 'trips_driver_status_idx');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->index(['school_id', 'recipient_user_id', 'read_at'], 'notifications_school_recipient_read_idx');
            $table->index(['recipient_user_id', 'created_at'], 'notifications_recipient_created_idx');
            $table->index(['school_id', 'type', 'created_at'], 'notifications_school_type_created_idx');
            $table->index(['school_id', 'bus_id', 'created_at'], 'notifications_school_bus_created_idx');
            $table->index(['school_id', 'student_id', 'created_at'], 'notifications_school_student_created_idx');
        });

        Schema::table('presences', function (Blueprint $table): void {
            $table->index(['school_id', 'trip_id', 'status'], 'presences_school_trip_status_idx');
            $table->index(['school_id', 'student_id', 'recorded_at'], 'presences_school_student_recorded_idx');
            $table->index(['school_id', 'status', 'recorded_at'], 'presences_school_status_recorded_idx');
        });

        Schema::table('schools', function (Blueprint $table): void {
            $table->index(['subscription_status', 'is_active'], 'schools_subscription_active_idx');
            $table->index('stripe_customer_id', 'schools_stripe_customer_idx');
            $table->index('stripe_subscription_id', 'schools_stripe_subscription_idx');
        });

        Schema::table('stripe_webhook_logs', function (Blueprint $table): void {
            $table->index(['status', 'created_at'], 'stripe_webhook_logs_status_created_idx');
            $table->index(['event_type', 'created_at'], 'stripe_webhook_logs_event_created_idx');
        });

        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->index(['school_id', 'created_at'], 'audit_logs_school_created_idx');
            $table->index(['user_id', 'created_at'], 'audit_logs_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex('audit_logs_user_created_idx');
            $table->dropIndex('audit_logs_school_created_idx');
        });

        Schema::table('stripe_webhook_logs', function (Blueprint $table): void {
            $table->dropIndex('stripe_webhook_logs_event_created_idx');
            $table->dropIndex('stripe_webhook_logs_status_created_idx');
        });

        Schema::table('schools', function (Blueprint $table): void {
            $table->dropIndex('schools_stripe_subscription_idx');
            $table->dropIndex('schools_stripe_customer_idx');
            $table->dropIndex('schools_subscription_active_idx');
        });

        Schema::table('presences', function (Blueprint $table): void {
            $table->dropIndex('presences_school_status_recorded_idx');
            $table->dropIndex('presences_school_student_recorded_idx');
            $table->dropIndex('presences_school_trip_status_idx');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex('notifications_school_student_created_idx');
            $table->dropIndex('notifications_school_bus_created_idx');
            $table->dropIndex('notifications_school_type_created_idx');
            $table->dropIndex('notifications_recipient_created_idx');
            $table->dropIndex('notifications_school_recipient_read_idx');
        });

        Schema::table('trips', function (Blueprint $table): void {
            $table->dropIndex('trips_driver_status_idx');
            $table->dropIndex('trips_bus_status_date_idx');
            $table->dropIndex('trips_school_driver_status_idx');
            $table->dropIndex('trips_school_bus_date_idx');
            $table->dropIndex('trips_school_date_status_idx');
        });

        Schema::table('students', function (Blueprint $table): void {
            $table->dropIndex('students_school_reg_code_idx');
            $table->dropIndex('students_school_status_idx');
            $table->dropIndex('students_school_parent_idx');
            $table->dropIndex('students_school_bus_idx');
            $table->dropIndex('students_school_full_name_idx');
        });

        Schema::table('buses', function (Blueprint $table): void {
            $table->dropIndex('buses_school_driver_idx');
            $table->dropIndex('buses_school_trip_status_idx');
            $table->dropIndex('buses_school_name_idx');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('users_school_cin_idx');
            $table->dropIndex('users_school_name_idx');
            $table->dropIndex('users_school_role_status_idx');
        });
    }
};

CREATE TYPE "iam"."oauth_provider" AS ENUM('GOOGLE', 'GITHUB', 'APPLE', 'FACEBOOK', 'MICROSOFT', 'DISCORD', 'TIKTOK', 'X');--> statement-breakpoint
ALTER TABLE "iam"."mfa_backup_codes" DROP CONSTRAINT "backup_code_unique";--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" DROP CONSTRAINT "oauth_provider_account_unique";--> statement-breakpoint
ALTER TABLE "iam"."permissions" DROP CONSTRAINT "permissions_name_unique";--> statement-breakpoint
ALTER TABLE "iam"."roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "iam"."services" DROP CONSTRAINT "service_external_unique";--> statement-breakpoint
DROP INDEX "iam"."audit_logs_actor_id_idx";--> statement-breakpoint
DROP INDEX "iam"."audit_logs_created_at_idx";--> statement-breakpoint
DROP INDEX "iam"."device_fingerprint_idx";--> statement-breakpoint
DROP INDEX "iam"."email_verifications_token_hash_idx";--> statement-breakpoint
DROP INDEX "iam"."identities_is_active_idx";--> statement-breakpoint
DROP INDEX "iam"."login_attempts_ip_address_idx";--> statement-breakpoint
DROP INDEX "iam"."login_attempts_email_idx";--> statement-breakpoint
DROP INDEX "iam"."login_attempts_created_at_idx";--> statement-breakpoint
DROP INDEX "iam"."password_resets_token_hash_idx";--> statement-breakpoint
DROP INDEX "iam"."sso_exchange_tickets_hash_idx";--> statement-breakpoint
ALTER TABLE "iam"."api_clients" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."api_clients" ALTER COLUMN "last_used_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."api_clients" ALTER COLUMN "last_rotated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."api_clients" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."api_clients" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."audit_logs" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "iam"."audit_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."audit_logs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."audit_logs" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."devices" ALTER COLUMN "last_seen_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."devices" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."devices" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."devices" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."email_verifications" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."email_verifications" ALTER COLUMN "verified_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."email_verifications" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."email_verifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."email_verifications" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."identities" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."identities" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "iam"."identities" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."identities" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."identities" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."identities" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."identity_roles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."identity_roles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."identity_roles" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."login_attempts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."login_attempts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."login_attempts" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."mfa_backup_codes" ALTER COLUMN "used_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."mfa_backup_codes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."mfa_backup_codes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."mfa_backup_codes" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."mfa_factors" ALTER COLUMN "is_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."mfa_factors" ALTER COLUMN "last_used_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."mfa_factors" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."mfa_factors" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."mfa_factors" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ALTER COLUMN "provider" SET DATA TYPE "iam"."oauth_provider" USING "provider"::"iam"."oauth_provider";--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."password_resets" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."password_resets" ALTER COLUMN "used_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."password_resets" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."password_resets" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."password_resets" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."permissions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."permissions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."permissions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."permissions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."role_permissions" ALTER COLUMN "assigned_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."role_permissions" ALTER COLUMN "assigned_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."role_permissions" ALTER COLUMN "assigned_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."roles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."roles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."roles" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."roles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."services" ALTER COLUMN "config" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "iam"."services" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."services" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."services" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ALTER COLUMN "revoked" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ALTER COLUMN "revoked_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."sessions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ALTER COLUMN "last_used_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."sso_exchange_tickets" ALTER COLUMN "is_used" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."sso_exchange_tickets" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."sso_exchange_tickets" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."sso_exchange_tickets" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."sso_exchange_tickets" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "username" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "email_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "birth_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "preferences" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "failed_login_attempts" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "lockout_until" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "last_login_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "last_activity_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "iam"."users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_at_idx" ON "iam"."audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_created_at_idx" ON "iam"."audit_logs" USING btree ("resource","resource_id","created_at");--> statement-breakpoint
CREATE INDEX "devices_identity_last_seen_idx" ON "iam"."devices" USING btree ("identity_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "devices_fingerprint_idx" ON "iam"."devices" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "identity_roles_role_id_idx" ON "iam"."identity_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_created_at_idx" ON "iam"."login_attempts" USING btree ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_email_created_at_idx" ON "iam"."login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "mfa_factors_identity_id_idx" ON "iam"."mfa_factors" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_identity_id_idx" ON "iam"."oauth_accounts" USING btree ("identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_name_unique_ci" ON "iam"."permissions" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "iam"."role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_unique_ci" ON "iam"."roles" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "iam"."email_verifications" ADD CONSTRAINT "email_verifications_token_hash_unique" UNIQUE("token_hash");--> statement-breakpoint
ALTER TABLE "iam"."mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_identity_hash_unique" UNIQUE("identity_id","code_hash");--> statement-breakpoint
ALTER TABLE "iam"."mfa_factors" ADD CONSTRAINT "mfa_factors_identity_type_unique" UNIQUE("identity_id","type");--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ADD CONSTRAINT "oauth_accounts_provider_account_unique" UNIQUE("provider","provider_account_id");--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ADD CONSTRAINT "oauth_accounts_identity_provider_unique" UNIQUE("identity_id","provider");--> statement-breakpoint
ALTER TABLE "iam"."password_resets" ADD CONSTRAINT "password_resets_token_hash_unique" UNIQUE("token_hash");--> statement-breakpoint
ALTER TABLE "iam"."permissions" ADD CONSTRAINT "permissions_resource_action_unique" UNIQUE("resource","action");--> statement-breakpoint
ALTER TABLE "iam"."services" ADD CONSTRAINT "services_service_type_external_id_unique" UNIQUE("service_type","external_id");--> statement-breakpoint
ALTER TABLE "iam"."permissions" ADD CONSTRAINT "permissions_resource_lowercase_check" CHECK ("iam"."permissions"."resource" = lower("iam"."permissions"."resource"));--> statement-breakpoint
ALTER TABLE "iam"."permissions" ADD CONSTRAINT "permissions_action_lowercase_check" CHECK ("iam"."permissions"."action" = lower("iam"."permissions"."action"));
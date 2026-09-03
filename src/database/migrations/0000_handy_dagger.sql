CREATE SCHEMA "iam";
--> statement-breakpoint
CREATE TYPE "iam"."identity_type" AS ENUM('HUMAN', 'SERVICE', 'API_CLIENT');--> statement-breakpoint
CREATE TYPE "iam"."mfa_type" AS ENUM('TOTP', 'SMS');--> statement-breakpoint
CREATE TYPE "iam"."service_type" AS ENUM('TELEGRAM', 'DISCORD', 'INTERNAL_API', 'WHATSAPP');--> statement-breakpoint
CREATE TABLE "iam"."api_clients" (
	"identity_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"client_id" varchar(100) NOT NULL,
	"secret_hash" varchar(255) NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"last_rotated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100),
	"resource_id" varchar(255),
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iam"."devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"fingerprint" varchar(255),
	"device_name" varchar(100),
	"browser" varchar(100),
	"operating_system" varchar(100),
	"ip_address" varchar(45),
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iam"."email_verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iam"."identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "iam"."identity_type" NOT NULL,
	"is_active" boolean DEFAULT true,
	"metadata" json,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "iam"."identity_roles" (
	"identity_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "identity_roles_identity_id_role_id_pk" PRIMARY KEY("identity_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."login_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid,
	"email" varchar(255),
	"ip_address" varchar(45) NOT NULL,
	"user_agent" varchar(500),
	"success" boolean NOT NULL,
	"failure_reason" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iam"."mfa_backup_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "backup_code_unique" UNIQUE("identity_id","code_hash")
);
--> statement-breakpoint
CREATE TABLE "iam"."mfa_factors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"type" "iam"."mfa_type" NOT NULL,
	"secret" varchar(255),
	"is_verified" boolean DEFAULT false,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iam"."oauth_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "oauth_provider_account_unique" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."password_resets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "iam"."permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"resource" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "iam"."role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "iam"."services" (
	"identity_id" uuid PRIMARY KEY NOT NULL,
	"service_type" "iam"."service_type" NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"config" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "service_external_unique" UNIQUE("service_type","external_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"device_id" uuid,
	"token_hash" varchar(255) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" varchar(500) NOT NULL,
	"platform" varchar(50),
	"city" varchar(150),
	"region" varchar(150),
	"country" varchar(100),
	"country_code" char(2),
	"continent" varchar(100),
	"continent_code" char(2),
	"latitude" double precision,
	"longitude" double precision,
	"timezone" varchar(64),
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "iam"."sso_exchange_tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_hash" varchar(255) NOT NULL,
	"identity_id" uuid NOT NULL,
	"is_used" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sso_exchange_tickets_ticket_hash_unique" UNIQUE("ticket_hash")
);
--> statement-breakpoint
CREATE TABLE "iam"."users" (
	"identity_id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false,
	"password_hash" varchar(255),
	"avatar_url" varchar(500),
	"phone" varchar(20),
	"birth_date" timestamp,
	"bio" varchar(500),
	"preferences" json,
	"failed_login_attempts" integer DEFAULT 0,
	"lockout_until" timestamp,
	"last_login_at" timestamp,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "iam"."api_clients" ADD CONSTRAINT "api_clients_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_identities_id_fk" FOREIGN KEY ("actor_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."devices" ADD CONSTRAINT "devices_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."email_verifications" ADD CONSTRAINT "email_verifications_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."identity_roles" ADD CONSTRAINT "identity_roles_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."identity_roles" ADD CONSTRAINT "identity_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."login_attempts" ADD CONSTRAINT "login_attempts_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."mfa_factors" ADD CONSTRAINT "mfa_factors_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."oauth_accounts" ADD CONSTRAINT "oauth_accounts_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."password_resets" ADD CONSTRAINT "password_resets_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "iam"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."services" ADD CONSTRAINT "services_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "iam"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."sso_exchange_tickets" ADD CONSTRAINT "sso_exchange_tickets_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."users" ADD CONSTRAINT "users_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "iam"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "iam"."audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "iam"."audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "device_fingerprint_idx" ON "iam"."devices" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "email_verifications_token_hash_idx" ON "iam"."email_verifications" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_verifications_identity_id_idx" ON "iam"."email_verifications" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "identities_type_idx" ON "iam"."identities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "identities_is_active_idx" ON "iam"."identities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_address_idx" ON "iam"."login_attempts" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "iam"."login_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "login_attempts_created_at_idx" ON "iam"."login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "password_resets_token_hash_idx" ON "iam"."password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_resets_identity_id_idx" ON "iam"."password_resets" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "sessions_identity_id_idx" ON "iam"."sessions" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "iam"."sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sso_exchange_tickets_hash_idx" ON "iam"."sso_exchange_tickets" USING btree ("ticket_hash");--> statement-breakpoint
CREATE INDEX "sso_exchange_tickets_expires_at_idx" ON "iam"."sso_exchange_tickets" USING btree ("expires_at");
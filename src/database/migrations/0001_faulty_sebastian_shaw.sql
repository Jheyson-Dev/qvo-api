ALTER TABLE "iam"."users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "iam"."users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique_ci" ON "iam"."users" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_ci" ON "iam"."users" USING btree (lower("email"));--> statement-breakpoint
ALTER TABLE "iam"."users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");
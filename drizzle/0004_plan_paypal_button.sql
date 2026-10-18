ALTER TABLE "membership_plans" ALTER COLUMN "paypal_url" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "membership_plans" ADD COLUMN "paypal_button_id" text DEFAULT '' NOT NULL;
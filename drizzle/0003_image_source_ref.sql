ALTER TABLE "images" ADD COLUMN "source_ref" text;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_source_ref_unique" UNIQUE("source_ref");
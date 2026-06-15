ALTER TABLE "subjects" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_slug_unique" UNIQUE("slug");
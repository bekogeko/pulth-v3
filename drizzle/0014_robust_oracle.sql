ALTER TABLE "concepts" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_slug_unique" UNIQUE("slug");
ALTER TABLE "questions" ALTER COLUMN "ownerId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "curriculumId" integer;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_curriculumId_curriculums_id_fk" FOREIGN KEY ("curriculumId") REFERENCES "public"."curriculums"("id") ON DELETE cascade ON UPDATE no action;
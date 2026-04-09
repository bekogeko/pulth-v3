ALTER TABLE "questions" ADD COLUMN "ownerId" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "slug" varchar(127) NOT NULL;
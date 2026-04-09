ALTER TABLE "question_options" DROP CONSTRAINT "question_options_questionId_quizzes_id_fk";
--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_correctAnswerId_question_options_id_fk";
--> statement-breakpoint
ALTER TABLE "question_options" ADD COLUMN "isCorrect" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "correctAnswerId";
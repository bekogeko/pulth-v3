ALTER TABLE "user_answers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_answers" CASCADE;--> statement-breakpoint
ALTER TABLE "question_concepts" DROP CONSTRAINT "question_concepts_questionId_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "question_concepts" DROP CONSTRAINT "question_concepts_conceptId_concepts_id_fk";
--> statement-breakpoint
ALTER TABLE "question_options" DROP CONSTRAINT "question_options_questionId_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "quiz_questions" DROP CONSTRAINT "quiz_questions_quizId_quizzes_id_fk";
--> statement-breakpoint
ALTER TABLE "quiz_questions" DROP CONSTRAINT "quiz_questions_questionId_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "topic_concepts" DROP CONSTRAINT "topic_concepts_topicId_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "topic_concepts" DROP CONSTRAINT "topic_concepts_conceptId_concepts_id_fk";
--> statement-breakpoint
ALTER TABLE "topics" DROP CONSTRAINT "topics_subjectId_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "question_concepts" ALTER COLUMN "questionId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "question_concepts" ALTER COLUMN "conceptId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "question_options" ALTER COLUMN "questionId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "quizId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "questionId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "topic_concepts" ALTER COLUMN "topicId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "topic_concepts" ALTER COLUMN "conceptId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "subjectId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_conceptId_concepts_id_fk" FOREIGN KEY ("conceptId") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_quizzes_id_fk" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_concepts" ADD CONSTRAINT "topic_concepts_topicId_topics_id_fk" FOREIGN KEY ("topicId") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_concepts" ADD CONSTRAINT "topic_concepts_conceptId_concepts_id_fk" FOREIGN KEY ("conceptId") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_subjectId_subjects_id_fk" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
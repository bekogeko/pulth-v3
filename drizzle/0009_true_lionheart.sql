CREATE TABLE "user_answers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_answers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" varchar(255) NOT NULL,
	"questionId" integer NOT NULL,
	"optionId" integer NOT NULL,
	"wasCorrect" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "explanation" varchar(255);--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_questionId_optionId_question_options_questionId_id_fk" FOREIGN KEY ("questionId","optionId") REFERENCES "public"."question_options"("questionId","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_correct_option_per_question_idx" ON "question_options" USING btree ("questionId") WHERE "question_options"."isCorrect" = true;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_id_unique" UNIQUE("questionId","id");
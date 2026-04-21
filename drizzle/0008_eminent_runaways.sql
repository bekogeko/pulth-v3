CREATE TABLE "user_answers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_answers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" varchar(255) NOT NULL,
	"optionId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "explanation" varchar(255);--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_optionId_question_options_id_fk" FOREIGN KEY ("optionId") REFERENCES "public"."question_options"("id") ON DELETE cascade ON UPDATE no action;
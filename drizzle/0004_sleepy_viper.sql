CREATE TABLE "concepts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "concepts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_concepts" (
	"questionId" integer,
	"conceptId" integer,
	CONSTRAINT "question_concepts_questionId_conceptId_pk" PRIMARY KEY("questionId","conceptId")
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"quizId" integer,
	"questionId" integer,
	CONSTRAINT "quiz_questions_quizId_questionId_pk" PRIMARY KEY("quizId","questionId")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subjects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_concepts" (
	"topicId" integer,
	"conceptId" integer,
	CONSTRAINT "topic_concepts_topicId_conceptId_pk" PRIMARY KEY("topicId","conceptId")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "topics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subjectId" integer,
	"title" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"slug" varchar(127) NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_answers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" varchar(255) NOT NULL,
	"questionId" integer,
	"isCorrect" boolean DEFAULT false NOT NULL,
	"createdAt" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_quizId_quizzes_id_fk";
--> statement-breakpoint
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_conceptId_concepts_id_fk" FOREIGN KEY ("conceptId") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_quizzes_id_fk" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_concepts" ADD CONSTRAINT "topic_concepts_topicId_topics_id_fk" FOREIGN KEY ("topicId") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_concepts" ADD CONSTRAINT "topic_concepts_conceptId_concepts_id_fk" FOREIGN KEY ("conceptId") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_subjectId_subjects_id_fk" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "quizId";
CREATE TABLE "curriculums" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "curriculums_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subjectId" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculumTopics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "curriculumTopics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"curriculumId" integer,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL
);
--> statement-breakpoint
DROP TABLE "quiz_questions" CASCADE;--> statement-breakpoint
DROP TABLE "quizzes" CASCADE;--> statement-breakpoint
ALTER TABLE "curriculums" ADD CONSTRAINT "curriculums_subjectId_subjects_id_fk" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculumTopics" ADD CONSTRAINT "curriculumTopics_curriculumId_curriculums_id_fk" FOREIGN KEY ("curriculumId") REFERENCES "public"."curriculums"("id") ON DELETE no action ON UPDATE no action;
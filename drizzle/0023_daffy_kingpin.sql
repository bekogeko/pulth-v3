CREATE TABLE "curriculum_concepts" (
	"curriculumId" integer NOT NULL,
	"conceptId" integer NOT NULL,
	"local_name" varchar(255),
	"local_description" varchar(255),
	"position" integer,
	CONSTRAINT "curriculum_concepts_curriculumId_conceptId_pk" PRIMARY KEY("curriculumId","conceptId")
);
--> statement-breakpoint
ALTER TABLE "curriculumTopics" DROP CONSTRAINT "curriculumTopics_curriculumId_curriculums_id_fk";
--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" DROP CONSTRAINT "curriculumTopics_concepts_curriculumTopicId_curriculumTopics_id_fk";
--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" DROP CONSTRAINT "curriculumTopics_concepts_conceptId_concepts_id_fk";
--> statement-breakpoint
ALTER TABLE "curriculumTopics" ALTER COLUMN "curriculumId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ALTER COLUMN "curriculumTopicId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ALTER COLUMN "conceptId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ADD CONSTRAINT "curriculumTopics_concepts_curriculumTopicId_conceptId_pk" PRIMARY KEY("curriculumTopicId","conceptId");--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ADD COLUMN "curriculumId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "curriculum_concepts" ADD CONSTRAINT "curriculum_concepts_curriculumId_curriculums_id_fk" FOREIGN KEY ("curriculumId") REFERENCES "public"."curriculums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_concepts" ADD CONSTRAINT "curriculum_concepts_conceptId_concepts_id_fk" FOREIGN KEY ("conceptId") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "curriculum_concepts_concept_id_idx" ON "curriculum_concepts" USING btree ("conceptId");--> statement-breakpoint
ALTER TABLE "curriculumTopics" ADD CONSTRAINT "curriculumTopics_curriculumId_curriculums_id_fk" FOREIGN KEY ("curriculumId") REFERENCES "public"."curriculums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ADD CONSTRAINT "curriculumTopics_concepts_curriculumTopicId_curriculumId_curriculumTopics_id_curriculumId_fk" FOREIGN KEY ("curriculumTopicId","curriculumId") REFERENCES "public"."curriculumTopics"("id","curriculumId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ADD CONSTRAINT "curriculumTopics_concepts_curriculumId_conceptId_curriculum_concepts_curriculumId_conceptId_fk" FOREIGN KEY ("curriculumId","conceptId") REFERENCES "public"."curriculum_concepts"("curriculumId","conceptId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculumTopics" ADD CONSTRAINT "curriculumTopics_id_curriculumId_unique" UNIQUE("id","curriculumId");
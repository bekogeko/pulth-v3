CREATE TABLE "curriculumTopics_concepts" (
	"curriculumTopicId" integer,
	"conceptId" integer
);
--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_legacy_mongo_id_unique";--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ADD CONSTRAINT "curriculumTopics_concepts_curriculumTopicId_curriculumTopics_id_fk" FOREIGN KEY ("curriculumTopicId") REFERENCES "public"."curriculumTopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculumTopics_concepts" ADD CONSTRAINT "curriculumTopics_concepts_conceptId_concepts_id_fk" FOREIGN KEY ("conceptId") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN "legacy_mongo_id";
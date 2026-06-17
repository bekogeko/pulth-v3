CREATE TABLE "article_curriculum_topics" (
	"article_id" integer NOT NULL,
	"curriculum_topic_id" integer NOT NULL,
	CONSTRAINT "article_curriculum_topics_article_id_curriculum_topic_id_pk" PRIMARY KEY("article_id","curriculum_topic_id")
);
--> statement-breakpoint
ALTER TABLE "article_curriculum_topics" ADD CONSTRAINT "article_curriculum_topics_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_curriculum_topics" ADD CONSTRAINT "article_curriculum_topics_curriculum_topic_id_curriculumTopics_id_fk" FOREIGN KEY ("curriculum_topic_id") REFERENCES "public"."curriculumTopics"("id") ON DELETE cascade ON UPDATE no action;
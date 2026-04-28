CREATE TABLE "article_concepts" (
	"article_id" integer NOT NULL,
	"concept_id" integer NOT NULL,
	CONSTRAINT "article_concepts_article_id_concept_id_pk" PRIMARY KEY("article_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "article_topics" (
	"article_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	CONSTRAINT "article_topics_article_id_topic_id_pk" PRIMARY KEY("article_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "article_concepts" ADD CONSTRAINT "article_concepts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_concepts" ADD CONSTRAINT "article_concepts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_topics" ADD CONSTRAINT "article_topics_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_topics" ADD CONSTRAINT "article_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
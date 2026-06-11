import type { MetadataRoute } from "next";

import { eq } from "drizzle-orm";

import { articleTable, conceptTable, topicTable } from "@/db/schema";
import { database } from "@/lib/database";
import { getAbsoluteUrl } from "@/lib/site-url";

function route(path: string) {
    return getAbsoluteUrl(path);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: route("/"),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: route("/quiz"),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: route("/ranking"),
            changeFrequency: "daily",
            priority: 0.7,
        },
        {
            url: route("/articles"),
            changeFrequency: "weekly",
            priority: 0.7,
        },
        {
            url: route("/privacy"),
            changeFrequency: "yearly",
            priority: 0.4,
        },
        {
            url: route("/terms-of-service"),
            changeFrequency: "yearly",
            priority: 0.4,
        },
    ];

    try {
        const [topics, concepts, articles] = await Promise.all([
            database.select({ slug: topicTable.slug }).from(topicTable),
            database.select({ slug: conceptTable.slug }).from(conceptTable),
            database
                .select({
                    slug: articleTable.slug,
                    updatedAt: articleTable.updatedAt,
                    publishedAt: articleTable.publishedAt,
                    createdAt: articleTable.createdAt,
                })
                .from(articleTable)
                .where(eq(articleTable.isPublished, true)),
        ]);

        return [
            ...staticRoutes,
            ...topics.map(({ slug }) => ({
                url: route(`/quiz/${slug}`),
                changeFrequency: "weekly" as const,
                priority: 0.8,
            })),
            ...concepts.map(({ slug }) => ({
                url: route(`/quiz/concepts/${slug}/solve`),
                changeFrequency: "weekly" as const,
                priority: 0.8,
            })),
            ...articles.map(({ slug, updatedAt, publishedAt, createdAt }) => ({
                url: route(`/articles/${slug}`),
                lastModified: updatedAt ?? publishedAt ?? createdAt,
                changeFrequency: "weekly" as const,
                priority: 0.7,
            })),
        ];
    } catch {
        return staticRoutes;
    }
}

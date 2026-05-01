import type { MetadataRoute } from "next";

import { eq } from "drizzle-orm";

import { articleTable, conceptTable, quizTable } from "@/db/schema";
import { database } from "@/lib/database";
import { getAbsoluteUrl } from "@/lib/site-url";

function route(path: string) {
    return getAbsoluteUrl(path);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: route("/"),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: route("/quiz"),
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: route("/ranking"),
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
        },
        {
            url: route("/articles"),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
        },
        {
            url: route("/privacy"),
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.4,
        },
        {
            url: route("/terms-of-service"),
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.4,
        },
    ];

    try {
        const [quizzes, concepts, articles] = await Promise.all([
            database.select({ slug: quizTable.slug }).from(quizTable),
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
            ...quizzes.map(({ slug }) => ({
                url: route(`/quiz/${slug}/solve`),
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

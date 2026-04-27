import type { MetadataRoute } from "next";

import { conceptTable, quizTable } from "@/db/schema";
import { database } from "@/lib/database";

const DEFAULT_SITE_URL = "http://localhost:3000";

function getSiteUrl() {
    const rawUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.SITE_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.VERCEL_URL ??
        DEFAULT_SITE_URL;
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

    return url.replace(/\/$/, "");
}

function route(path: string) {
    return `${getSiteUrl()}${path}`;
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
    ];

    try {
        const [quizzes, concepts] = await Promise.all([
            database.select({ slug: quizTable.slug }).from(quizTable),
            database.select({ slug: conceptTable.slug }).from(conceptTable),
        ]);

        return [
            ...staticRoutes,
            ...quizzes.map(({ slug }) => ({
                url: route(`/quiz/${slug}/solve`),
                lastModified: now,
                changeFrequency: "weekly" as const,
                priority: 0.8,
            })),
            ...concepts.map(({ slug }) => ({
                url: route(`/quiz/concepts/${slug}/solve`),
                lastModified: now,
                changeFrequency: "weekly" as const,
                priority: 0.8,
            })),
        ];
    } catch {
        return staticRoutes;
    }
}

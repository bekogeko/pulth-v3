"use server";

import {articleTable} from "@/db/schema";
import {database} from "@/lib/database";
import {and, desc, eq} from "drizzle-orm";

export async function getArticles() {
    return database
        .select({
            id: articleTable.id,
            title: articleTable.title,
            description: articleTable.description,
            slug: articleTable.slug,
            publishedAt: articleTable.publishedAt,
            createdAt: articleTable.createdAt,
        })
        .from(articleTable)
        .where(eq(articleTable.isPublished, true))
        .orderBy(desc(articleTable.publishedAt), desc(articleTable.createdAt));
}

export async function getArticleBySlug(slug: string) {
    const [article] = await database
        .select({
            id: articleTable.id,
            title: articleTable.title,
            description: articleTable.description,
            slug: articleTable.slug,
            body: articleTable.body,
            publishedAt: articleTable.publishedAt,
            createdAt: articleTable.createdAt,
            updatedAt: articleTable.updatedAt,
        })
        .from(articleTable)
        .where(and(
            eq(articleTable.slug, slug),
            eq(articleTable.isPublished, true),
        ))
        .limit(1);

    return article;
}

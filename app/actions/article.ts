"use server";

import {
    articleConceptsTable,
    articleTable,
    articleTopicsTable,
    conceptTable,
    topicTable
} from "@/db/schema";
import {database} from "@/lib/database";
import type {EditorJsOutput} from "@/schemas/EditorTypes";
import {auth} from "@clerk/nextjs/server";
import {and, asc, desc, eq, inArray, sql} from "drizzle-orm";
import {revalidatePath} from "next/cache";

const EMPTY_EDITOR_BODY: EditorJsOutput = {
    time: 0,
    blocks: [],
    version: "2.31.5",
};

type ArticleMutationState = {
    status: "idle" | "success" | "error";
    message?: string;
    slug?: string;
};

type ArticleTaxonomyInput = {
    articleId: number;
    conceptIds: number[];
    topicIds: number[];
};

function slugify(input: string) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

function normalizeIds(ids: number[]) {
    return [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
}

async function createUniqueSlug(title: string) {
    const baseSlug = slugify(title) || "article";
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
        const [existingArticle] = await database
            .select({id: articleTable.id})
            .from(articleTable)
            .where(eq(articleTable.slug, candidate))
            .limit(1);

        if (!existingArticle) {
            return candidate;
        }

        candidate = `${baseSlug}-${suffix}`;
        suffix += 1;
    }
}

function isEditorJsOutput(value: unknown): value is EditorJsOutput {
    if (!value || typeof value !== "object") {
        return false;
    }

    const blocks = (value as {blocks?: unknown}).blocks;
    return Array.isArray(blocks);
}

async function assertTaxonomyExists(conceptIds: number[], topicIds: number[]) {
    if (conceptIds.length > 0) {
        const existingConcepts = await database
            .select({id: conceptTable.id})
            .from(conceptTable)
            .where(inArray(conceptTable.id, conceptIds));

        if (existingConcepts.length !== conceptIds.length) {
            return "One or more concepts could not be found.";
        }
    }

    if (topicIds.length > 0) {
        const existingTopics = await database
            .select({id: topicTable.id})
            .from(topicTable)
            .where(inArray(topicTable.id, topicIds));

        if (existingTopics.length !== topicIds.length) {
            return "One or more topics could not be found.";
        }
    }

    return null;
}

async function updateArticleTaxonomy(tx: Parameters<Parameters<typeof database.transaction>[0]>[0], {
    articleId,
    conceptIds,
    topicIds,
}: ArticleTaxonomyInput) {
    await tx
        .delete(articleConceptsTable)
        .where(eq(articleConceptsTable.articleId, articleId));

    if (conceptIds.length > 0) {
        await tx.insert(articleConceptsTable).values(
            conceptIds.map((conceptId) => ({
                articleId,
                conceptId,
            }))
        );
    }

    await tx
        .delete(articleTopicsTable)
        .where(eq(articleTopicsTable.articleId, articleId));

    if (topicIds.length > 0) {
        await tx.insert(articleTopicsTable).values(
            topicIds.map((topicId) => ({
                articleId,
                topicId,
            }))
        );
    }
}

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

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
import {randomBytes} from "node:crypto";
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

const ARTICLE_SLUG_RANDOM_ID_LENGTH = 8;
const ARTICLE_SLUG_RANDOM_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ARTICLE_SLUG_MAX_LENGTH = 127;

function slugify(input: string) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, ARTICLE_SLUG_MAX_LENGTH - ARTICLE_SLUG_RANDOM_ID_LENGTH - 1);
}

function createRandomSlugId() {
    const bytes = randomBytes(ARTICLE_SLUG_RANDOM_ID_LENGTH);

    return Array.from(bytes, (byte) => (
        ARTICLE_SLUG_RANDOM_ID_ALPHABET[byte % ARTICLE_SLUG_RANDOM_ID_ALPHABET.length]
    )).join("");
}

function normalizeIds(ids: number[]) {
    return [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
}

async function createUniqueSlug(title: string) {
    const baseSlug = slugify(title) || "article";

    while (true) {
        const candidate = `${baseSlug}-${createRandomSlugId()}`;
        const [existingArticle] = await database
            .select({id: articleTable.id})
            .from(articleTable)
            .where(eq(articleTable.slug, candidate))
            .limit(1);

        if (!existingArticle) {
            return candidate;
        }
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
    type ConceptJson = {
        id: number;
        name: string;
        slug: string;
    };

    type TopicJson = {
        id: number;
        title: string;
        slug: string;
    };

    const conceptsSq = database
        .select({
            concepts: sql<ConceptJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${conceptTable.id},
                            'name', ${conceptTable.name},
                            'slug', ${conceptTable.slug}
                        )
                        order by ${conceptTable.name}
                    ),
                    '[]'::json
                )
            `.as("concepts"),
        })
        .from(articleConceptsTable)
        .innerJoin(conceptTable, eq(articleConceptsTable.conceptId, conceptTable.id))
        .where(eq(articleConceptsTable.articleId, articleTable.id))
        .as("published_article_concepts_sq");

    const topicsSq = database
        .select({
            topics: sql<TopicJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${topicTable.id},
                            'title', ${topicTable.title},
                            'slug', ${topicTable.slug}
                        )
                        order by ${topicTable.title}
                    ),
                    '[]'::json
                )
            `.as("topics"),
        })
        .from(articleTopicsTable)
        .innerJoin(topicTable, eq(articleTopicsTable.topicId, topicTable.id))
        .where(eq(articleTopicsTable.articleId, articleTable.id))
        .as("published_article_topics_sq");

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
            concepts: sql<ConceptJson[]>`coalesce(${conceptsSq.concepts}, '[]'::json)`,
            topics: sql<TopicJson[]>`coalesce(${topicsSq.topics}, '[]'::json)`,
        })
        .from(articleTable)
        .where(and(
            eq(articleTable.slug, slug),
            eq(articleTable.isPublished, true),
        ))
        .leftJoinLateral(conceptsSq, sql`true`)
        .leftJoinLateral(topicsSq, sql`true`)
        .limit(1);

    return article;
}

export async function getMyArticles() {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return [];
    }

    type ConceptJson = {
        id: number;
        name: string;
    };

    type TopicJson = {
        id: number;
        title: string;
    };

    const conceptsSq = database
        .select({
            concepts: sql<ConceptJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${conceptTable.id},
                            'name', ${conceptTable.name}
                        )
                        order by ${conceptTable.name}
                    ),
                    '[]'::json
                )
            `.as("concepts"),
        })
        .from(articleConceptsTable)
        .innerJoin(conceptTable, eq(articleConceptsTable.conceptId, conceptTable.id))
        .where(eq(articleConceptsTable.articleId, articleTable.id))
        .as("article_concepts_sq");

    const topicsSq = database
        .select({
            topics: sql<TopicJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${topicTable.id},
                            'title', ${topicTable.title}
                        )
                        order by ${topicTable.title}
                    ),
                    '[]'::json
                )
            `.as("topics"),
        })
        .from(articleTopicsTable)
        .innerJoin(topicTable, eq(articleTopicsTable.topicId, topicTable.id))
        .where(eq(articleTopicsTable.articleId, articleTable.id))
        .as("article_topics_sq");

    return database
        .select({
            id: articleTable.id,
            title: articleTable.title,
            description: articleTable.description,
            slug: articleTable.slug,
            isPublished: articleTable.isPublished,
            publishedAt: articleTable.publishedAt,
            updatedAt: articleTable.updatedAt,
            createdAt: articleTable.createdAt,
            concepts: sql<ConceptJson[]>`coalesce(${conceptsSq.concepts}, '[]'::json)`,
            topics: sql<TopicJson[]>`coalesce(${topicsSq.topics}, '[]'::json)`,
        })
        .from(articleTable)
        .where(eq(articleTable.authorId, userId))
        .leftJoinLateral(conceptsSq, sql`true`)
        .leftJoinLateral(topicsSq, sql`true`)
        .orderBy(desc(articleTable.updatedAt), desc(articleTable.createdAt));
}

export async function getArticleEditorOptions() {
    const {isAuthenticated} = await auth();

    if (!isAuthenticated) {
        return {
            concepts: [],
            topics: [],
        };
    }

    const [concepts, topics] = await Promise.all([
        database
            .select({
                id: conceptTable.id,
                name: conceptTable.name,
            })
            .from(conceptTable)
            .orderBy(asc(conceptTable.name)),
        database
            .select({
                id: topicTable.id,
                title: topicTable.title,
            })
            .from(topicTable)
            .orderBy(asc(topicTable.title)),
    ]);

    return {
        concepts,
        topics,
    };
}

export async function getMyArticleForEdit(slug: string) {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return null;
    }

    type ConceptJson = {
        id: number;
        name: string;
    };

    type TopicJson = {
        id: number;
        title: string;
    };

    const conceptsSq = database
        .select({
            concepts: sql<ConceptJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${conceptTable.id},
                            'name', ${conceptTable.name}
                        )
                        order by ${conceptTable.name}
                    ),
                    '[]'::json
                )
            `.as("concepts"),
        })
        .from(articleConceptsTable)
        .innerJoin(conceptTable, eq(articleConceptsTable.conceptId, conceptTable.id))
        .where(eq(articleConceptsTable.articleId, articleTable.id))
        .as("article_editor_concepts_sq");

    const topicsSq = database
        .select({
            topics: sql<TopicJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${topicTable.id},
                            'title', ${topicTable.title}
                        )
                        order by ${topicTable.title}
                    ),
                    '[]'::json
                )
            `.as("topics"),
        })
        .from(articleTopicsTable)
        .innerJoin(topicTable, eq(articleTopicsTable.topicId, topicTable.id))
        .where(eq(articleTopicsTable.articleId, articleTable.id))
        .as("article_editor_topics_sq");

    const [article] = await database
        .select({
            id: articleTable.id,
            title: articleTable.title,
            description: articleTable.description,
            slug: articleTable.slug,
            body: articleTable.body,
            draftBody: articleTable.draftBody,
            isPublished: articleTable.isPublished,
            publishedAt: articleTable.publishedAt,
            updatedAt: articleTable.updatedAt,
            concepts: sql<ConceptJson[]>`coalesce(${conceptsSq.concepts}, '[]'::json)`,
            topics: sql<TopicJson[]>`coalesce(${topicsSq.topics}, '[]'::json)`,
        })
        .from(articleTable)
        .where(and(
            eq(articleTable.slug, slug),
            eq(articleTable.authorId, userId),
        ))
        .leftJoinLateral(conceptsSq, sql`true`)
        .leftJoinLateral(topicsSq, sql`true`)
        .limit(1);

    return article ?? null;
}

export async function createArticleDraft(_prevState: ArticleMutationState, formData: FormData): Promise<ArticleMutationState> {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {status: "error", message: "You must be signed in to create an article."};
    }

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!title) {
        return {status: "error", message: "Enter a title."};
    }

    if (title.length > 255) {
        return {status: "error", message: "Title must be 255 characters or fewer."};
    }

    if (!description) {
        return {status: "error", message: "Enter a description."};
    }

    const slug = await createUniqueSlug(title);

    try {
        await database.insert(articleTable).values({
            authorId: userId,
            title,
            description,
            slug,
            body: EMPTY_EDITOR_BODY,
            draftBody: EMPTY_EDITOR_BODY,
            isPublished: false,
        });

        revalidatePath("/articles/self");

        return {
            status: "success",
            message: "Article draft created.",
            slug,
        };
    } catch {
        return {status: "error", message: "Unable to create the article right now."};
    }
}

export async function saveArticleDraft(input: {
    slug: string;
    title: string;
    description: string;
    body: EditorJsOutput;
    conceptIds: number[];
    topicIds: number[];
}) {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {status: "error" as const, message: "You must be signed in to save this article."};
    }

    const title = input.title.trim();
    const description = input.description.trim();
    const conceptIds = normalizeIds(input.conceptIds);
    const topicIds = normalizeIds(input.topicIds);

    if (!title) {
        return {status: "error" as const, message: "Enter a title."};
    }

    if (title.length > 255) {
        return {status: "error" as const, message: "Title must be 255 characters or fewer."};
    }

    if (!description) {
        return {status: "error" as const, message: "Enter a description."};
    }

    if (!isEditorJsOutput(input.body)) {
        return {status: "error" as const, message: "Article body is not valid EditorJS data."};
    }

    const taxonomyError = await assertTaxonomyExists(conceptIds, topicIds);
    if (taxonomyError) {
        return {status: "error" as const, message: taxonomyError};
    }

    const [article] = await database
        .select({
            id: articleTable.id,
            title: articleTable.title,
            slug: articleTable.slug,
        })
        .from(articleTable)
        .where(and(
            eq(articleTable.slug, input.slug),
            eq(articleTable.authorId, userId),
        ))
        .limit(1);

    if (!article) {
        return {status: "error" as const, message: "Article not found or you do not have access to it."};
    }

    const slug = title === article.title ? article.slug : await createUniqueSlug(title);

    try {
        await database.transaction(async (tx) => {
            await tx
                .update(articleTable)
                .set({
                    title,
                    description,
                    slug,
                    draftBody: input.body,
                    updatedAt: new Date(),
                })
                .where(eq(articleTable.id, article.id));

            await updateArticleTaxonomy(tx, {
                articleId: article.id,
                conceptIds,
                topicIds,
            });
        });

        revalidatePath("/articles/self");
        revalidatePath(`/articles/${input.slug}`);
        revalidatePath(`/articles/${input.slug}/edit`);
        revalidatePath(`/articles/${slug}`);
        revalidatePath(`/articles/${slug}/edit`);

        return {status: "success" as const, message: "Draft saved.", slug};
    } catch {
        return {status: "error" as const, message: "Unable to save the draft right now."};
    }
}

export async function publishArticleDraft(slug: string) {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {status: "error" as const, message: "You must be signed in to publish this article."};
    }

    const [article] = await database
        .select({
            id: articleTable.id,
            draftBody: articleTable.draftBody,
            body: articleTable.body,
            publishedAt: articleTable.publishedAt,
        })
        .from(articleTable)
        .where(and(
            eq(articleTable.slug, slug),
            eq(articleTable.authorId, userId),
        ))
        .limit(1);

    if (!article) {
        return {status: "error" as const, message: "Article not found or you do not have access to it."};
    }

    try {
        await database
            .update(articleTable)
            .set({
                body: article.draftBody ?? article.body,
                isPublished: true,
                publishedAt: article.publishedAt ?? new Date(),
                updatedAt: new Date(),
            })
            .where(eq(articleTable.id, article.id));

        revalidatePath("/articles");
        revalidatePath("/articles/self");
        revalidatePath(`/articles/${slug}`);
        revalidatePath(`/articles/${slug}/edit`);

        return {status: "success" as const, message: "Article published."};
    } catch {
        return {status: "error" as const, message: "Unable to publish the article right now."};
    }
}

export async function unpublishArticle(slug: string) {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {status: "error" as const, message: "You must be signed in to unpublish this article."};
    }

    const [article] = await database
        .select({id: articleTable.id})
        .from(articleTable)
        .where(and(
            eq(articleTable.slug, slug),
            eq(articleTable.authorId, userId),
        ))
        .limit(1);

    if (!article) {
        return {status: "error" as const, message: "Article not found or you do not have access to it."};
    }

    try {
        await database
            .update(articleTable)
            .set({
                isPublished: false,
                updatedAt: new Date(),
            })
            .where(eq(articleTable.id, article.id));

        revalidatePath("/articles");
        revalidatePath("/articles/self");
        revalidatePath(`/articles/${slug}`);
        revalidatePath(`/articles/${slug}/edit`);

        return {status: "success" as const, message: "Article unpublished."};
    } catch {
        return {status: "error" as const, message: "Unable to unpublish the article right now."};
    }
}

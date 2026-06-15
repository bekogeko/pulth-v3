"use server";

import {clerkClient} from "@clerk/nextjs/server";
import {and, asc, count, countDistinct, desc, eq, ne} from "drizzle-orm";
import {revalidatePath} from "next/cache";

import {
    articleConceptsTable,
    articleTable,
    articleTopicsTable,
    conceptTable,
    questionConceptsTable,
    questionTable,
    subjectTable,
    topicTable,
    userAnswerTable,
} from "@/db/schema";
import {isAdmin} from "@/lib/admin";
import {database} from "@/lib/database";

type AdminMutationState = {
    status: "success" | "error";
    message: string;
};

const NOT_AUTHORIZED: AdminMutationState = {
    status: "error",
    message: "You are not authorized to perform this action.",
};

const CONCEPT_SLUG_MAX_LENGTH = 255;
const TOPIC_SLUG_MAX_LENGTH = 127;
const SUBJECT_SLUG_MAX_LENGTH = 255;
const SLUG_SUFFIX_RESERVE = 8;

function slugify(input: string, maxLength: number) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, maxLength - SLUG_SUFFIX_RESERVE);
}

async function createUniqueSlug(opts: {
    title: string;
    maxLength: number;
    fallback: string;
    exists: (candidate: string) => Promise<boolean>;
}) {
    const base = slugify(opts.title, opts.maxLength) || opts.fallback;
    let candidate = base;
    let suffix = 2;

    while (await opts.exists(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }

    return candidate;
}

function isForeignKeyViolation(error: unknown): boolean {
    if (!error || typeof error !== "object") {
        return false;
    }

    if ((error as {code?: unknown}).code === "23503") {
        return true;
    }

    return isForeignKeyViolation((error as {cause?: unknown}).cause);
}

// Lets client components (e.g. the sidebar) ask whether the current user is an
// admin, since private metadata is never exposed to the browser.
export async function getIsAdmin() {
    return isAdmin();
}

// --- Overview ---

export async function getAdminOverview() {
    if (!(await isAdmin())) {
        return null;
    }

    const countOf = async (query: Promise<{value: number}[]>) => (await query)[0]?.value ?? 0;

    const [articles, publishedArticles, questions, concepts, topics, subjects, answers] = await Promise.all([
        countOf(database.select({value: count()}).from(articleTable)),
        countOf(
            database
                .select({value: count()})
                .from(articleTable)
                .where(eq(articleTable.isPublished, true))
        ),
        countOf(database.select({value: count()}).from(questionTable)),
        countOf(database.select({value: count()}).from(conceptTable)),
        countOf(database.select({value: count()}).from(topicTable)),
        countOf(database.select({value: count()}).from(subjectTable)),
        countOf(database.select({value: count()}).from(userAnswerTable)),
    ]);

    return {
        articles,
        publishedArticles,
        questions,
        concepts,
        topics,
        subjects,
        answers,
    };
}

// --- Articles ---

export async function getAdminArticles() {
    if (!(await isAdmin())) {
        return [];
    }

    const articles = await database
        .select({
            id: articleTable.id,
            title: articleTable.title,
            description: articleTable.description,
            slug: articleTable.slug,
            authorId: articleTable.authorId,
            isPublished: articleTable.isPublished,
            publishedAt: articleTable.publishedAt,
            createdAt: articleTable.createdAt,
            updatedAt: articleTable.updatedAt,
        })
        .from(articleTable)
        .orderBy(desc(articleTable.createdAt));

    const authorIds = [...new Set(articles.map((article) => article.authorId))];
    let authorNames = new Map<string, string>();

    if (authorIds.length > 0) {
        try {
            const client = await clerkClient();
            const users = await client.users.getUserList({userId: authorIds, limit: 500});

            authorNames = new Map(users.data.map((user) => [
                user.id,
                user.fullName ?? user.primaryEmailAddress?.emailAddress ?? user.id,
            ]));
        } catch {
            // Clerk lookup is cosmetic; fall back to raw author ids.
        }
    }

    return articles.map((article) => ({
        ...article,
        authorName: authorNames.get(article.authorId) ?? article.authorId,
    }));
}

function revalidateArticlePaths(slug: string) {
    revalidatePath("/articles");
    revalidatePath("/articles/self");
    revalidatePath(`/articles/${slug}`);
    revalidatePath(`/articles/${slug}/edit`);
}

export async function adminSetArticlePublished(articleId: number, isPublished: boolean): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const [article] = await database
        .select({
            id: articleTable.id,
            slug: articleTable.slug,
            body: articleTable.body,
            draftBody: articleTable.draftBody,
            publishedAt: articleTable.publishedAt,
        })
        .from(articleTable)
        .where(eq(articleTable.id, articleId))
        .limit(1);

    if (!article) {
        return {status: "error", message: "Article not found."};
    }

    try {
        await database
            .update(articleTable)
            .set(isPublished ? {
                body: article.draftBody ?? article.body,
                isPublished: true,
                publishedAt: article.publishedAt ?? new Date(),
                updatedAt: new Date(),
            } : {
                isPublished: false,
                updatedAt: new Date(),
            })
            .where(eq(articleTable.id, article.id));

        revalidateArticlePaths(article.slug);

        return {
            status: "success",
            message: isPublished ? "Article published." : "Article unpublished.",
        };
    } catch {
        return {status: "error", message: "Unable to update the article right now."};
    }
}

export async function adminDeleteArticle(articleId: number): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const [article] = await database
        .select({
            id: articleTable.id,
            slug: articleTable.slug,
        })
        .from(articleTable)
        .where(eq(articleTable.id, articleId))
        .limit(1);

    if (!article) {
        return {status: "error", message: "Article not found."};
    }

    try {
        await database.delete(articleTable).where(eq(articleTable.id, article.id));

        revalidateArticlePaths(article.slug);

        return {status: "success", message: "Article deleted."};
    } catch {
        return {status: "error", message: "Unable to delete the article right now."};
    }
}

// --- Concepts ---

async function conceptSlugExists(candidate: string, excludeId?: number) {
    const [existing] = await database
        .select({id: conceptTable.id})
        .from(conceptTable)
        .where(excludeId === undefined
            ? eq(conceptTable.slug, candidate)
            : and(eq(conceptTable.slug, candidate), ne(conceptTable.id, excludeId)))
        .limit(1);

    return Boolean(existing);
}

export async function getAdminConcepts() {
    if (!(await isAdmin())) {
        return [];
    }

    return database
        .select({
            id: conceptTable.id,
            name: conceptTable.name,
            slug: conceptTable.slug,
            description: conceptTable.description,
            questionCount: countDistinct(questionConceptsTable.questionId),
            articleCount: countDistinct(articleConceptsTable.articleId),
        })
        .from(conceptTable)
        .leftJoin(questionConceptsTable, eq(questionConceptsTable.conceptId, conceptTable.id))
        .leftJoin(articleConceptsTable, eq(articleConceptsTable.conceptId, conceptTable.id))
        .groupBy(conceptTable.id)
        .orderBy(asc(conceptTable.name));
}

function validateConceptInput(name: string, description: string): AdminMutationState | null {
    if (!name) {
        return {status: "error", message: "Enter a name."};
    }

    if (name.length > 255) {
        return {status: "error", message: "Name must be 255 characters or fewer."};
    }

    if (description.length > 255) {
        return {status: "error", message: "Description must be 255 characters or fewer."};
    }

    return null;
}

export async function createConcept(input: {name: string; description: string}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const name = input.name.trim();
    const description = input.description.trim();

    const validationError = validateConceptInput(name, description);
    if (validationError) {
        return validationError;
    }

    const slug = await createUniqueSlug({
        title: name,
        maxLength: CONCEPT_SLUG_MAX_LENGTH,
        fallback: "concept",
        exists: (candidate) => conceptSlugExists(candidate),
    });

    try {
        await database.insert(conceptTable).values({
            name,
            slug,
            description: description || null,
        });

        return {status: "success", message: "Concept created."};
    } catch {
        return {status: "error", message: "Unable to create the concept right now."};
    }
}

export async function updateConcept(input: {id: number; name: string; description: string}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const name = input.name.trim();
    const description = input.description.trim();

    const validationError = validateConceptInput(name, description);
    if (validationError) {
        return validationError;
    }

    const [concept] = await database
        .select({
            id: conceptTable.id,
            name: conceptTable.name,
            slug: conceptTable.slug,
        })
        .from(conceptTable)
        .where(eq(conceptTable.id, input.id))
        .limit(1);

    if (!concept) {
        return {status: "error", message: "Concept not found."};
    }

    const slug = name === concept.name ? concept.slug : await createUniqueSlug({
        title: name,
        maxLength: CONCEPT_SLUG_MAX_LENGTH,
        fallback: "concept",
        exists: (candidate) => conceptSlugExists(candidate, concept.id),
    });

    try {
        await database
            .update(conceptTable)
            .set({
                name,
                slug,
                description: description || null,
            })
            .where(eq(conceptTable.id, concept.id));

        return {status: "success", message: "Concept updated."};
    } catch {
        return {status: "error", message: "Unable to update the concept right now."};
    }
}

export async function deleteConcept(conceptId: number): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    try {
        await database.delete(conceptTable).where(eq(conceptTable.id, conceptId));

        return {status: "success", message: "Concept deleted."};
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return {
                status: "error",
                message: "This concept has rating history attached and cannot be deleted.",
            };
        }

        return {status: "error", message: "Unable to delete the concept right now."};
    }
}

// --- Topics ---

async function topicSlugExists(candidate: string, excludeId?: number) {
    const [existing] = await database
        .select({id: topicTable.id})
        .from(topicTable)
        .where(excludeId === undefined
            ? eq(topicTable.slug, candidate)
            : and(eq(topicTable.slug, candidate), ne(topicTable.id, excludeId)))
        .limit(1);

    return Boolean(existing);
}

export async function getAdminTopics() {
    if (!(await isAdmin())) {
        return [];
    }

    return database
        .select({
            id: topicTable.id,
            title: topicTable.title,
            slug: topicTable.slug,
            description: topicTable.description,
            subjectId: topicTable.subjectId,
            subjectName: subjectTable.name,
            articleCount: countDistinct(articleTopicsTable.articleId),
        })
        .from(topicTable)
        .innerJoin(subjectTable, eq(topicTable.subjectId, subjectTable.id))
        .leftJoin(articleTopicsTable, eq(articleTopicsTable.topicId, topicTable.id))
        .groupBy(topicTable.id, subjectTable.id)
        .orderBy(asc(topicTable.title));
}

async function validateTopicInput(subjectId: number, title: string, description: string): Promise<AdminMutationState | null> {
    if (!title) {
        return {status: "error", message: "Enter a title."};
    }

    if (title.length > 255) {
        return {status: "error", message: "Title must be 255 characters or fewer."};
    }

    if (!description) {
        return {status: "error", message: "Enter a description."};
    }

    if (description.length > 255) {
        return {status: "error", message: "Description must be 255 characters or fewer."};
    }

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
        return {status: "error", message: "Choose a subject."};
    }

    const [subject] = await database
        .select({id: subjectTable.id})
        .from(subjectTable)
        .where(eq(subjectTable.id, subjectId))
        .limit(1);

    if (!subject) {
        return {status: "error", message: "The chosen subject could not be found."};
    }

    return null;
}

export async function createTopic(input: {subjectId: number; title: string; description: string}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const title = input.title.trim();
    const description = input.description.trim();

    const validationError = await validateTopicInput(input.subjectId, title, description);
    if (validationError) {
        return validationError;
    }

    const slug = await createUniqueSlug({
        title,
        maxLength: TOPIC_SLUG_MAX_LENGTH,
        fallback: "topic",
        exists: (candidate) => topicSlugExists(candidate),
    });

    try {
        await database.insert(topicTable).values({
            subjectId: input.subjectId,
            title,
            description,
            slug,
        });

        return {status: "success", message: "Topic created."};
    } catch {
        return {status: "error", message: "Unable to create the topic right now."};
    }
}

export async function updateTopic(input: {
    id: number;
    subjectId: number;
    title: string;
    description: string;
}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const title = input.title.trim();
    const description = input.description.trim();

    const validationError = await validateTopicInput(input.subjectId, title, description);
    if (validationError) {
        return validationError;
    }

    const [topic] = await database
        .select({
            id: topicTable.id,
            title: topicTable.title,
            slug: topicTable.slug,
        })
        .from(topicTable)
        .where(eq(topicTable.id, input.id))
        .limit(1);

    if (!topic) {
        return {status: "error", message: "Topic not found."};
    }

    const slug = title === topic.title ? topic.slug : await createUniqueSlug({
        title,
        maxLength: TOPIC_SLUG_MAX_LENGTH,
        fallback: "topic",
        exists: (candidate) => topicSlugExists(candidate, topic.id),
    });

    try {
        await database
            .update(topicTable)
            .set({
                subjectId: input.subjectId,
                title,
                description,
                slug,
            })
            .where(eq(topicTable.id, topic.id));

        return {status: "success", message: "Topic updated."};
    } catch {
        return {status: "error", message: "Unable to update the topic right now."};
    }
}

export async function deleteTopic(topicId: number): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    try {
        await database.delete(topicTable).where(eq(topicTable.id, topicId));

        return {status: "success", message: "Topic deleted."};
    } catch {
        return {status: "error", message: "Unable to delete the topic right now."};
    }
}

// --- Subjects ---

async function subjectSlugExists(candidate: string, excludeId?: number) {
    const [existing] = await database
        .select({id: subjectTable.id})
        .from(subjectTable)
        .where(excludeId === undefined
            ? eq(subjectTable.slug, candidate)
            : and(eq(subjectTable.slug, candidate), ne(subjectTable.id, excludeId)))
        .limit(1);

    return Boolean(existing);
}

export async function getAdminSubjects() {
    if (!(await isAdmin())) {
        return [];
    }

    return database
        .select({
            id: subjectTable.id,
            name: subjectTable.name,
            topicCount: count(topicTable.id),
        })
        .from(subjectTable)
        .leftJoin(topicTable, eq(topicTable.subjectId, subjectTable.id))
        .groupBy(subjectTable.id)
        .orderBy(asc(subjectTable.name));
}

function validateSubjectName(name: string): AdminMutationState | null {
    if (!name) {
        return {status: "error", message: "Enter a name."};
    }

    if (name.length > 255) {
        return {status: "error", message: "Name must be 255 characters or fewer."};
    }

    return null;
}

export async function createSubject(input: {name: string}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const name = input.name.trim();

    const validationError = validateSubjectName(name);
    if (validationError) {
        return validationError;
    }

    const slug = await createUniqueSlug({
        title: name,
        maxLength: SUBJECT_SLUG_MAX_LENGTH,
        fallback: "subject",
        exists: (candidate) => subjectSlugExists(candidate),
    });

    try {
        await database.insert(subjectTable).values({name, slug});

        return {status: "success", message: "Subject created."};
    } catch {
        return {status: "error", message: "Unable to create the subject right now."};
    }
}

export async function updateSubject(input: {id: number; name: string}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    const name = input.name.trim();

    const validationError = validateSubjectName(name);
    if (validationError) {
        return validationError;
    }

    const [subject] = await database
        .select({
            id: subjectTable.id,
            name: subjectTable.name,
            slug: subjectTable.slug,
        })
        .from(subjectTable)
        .where(eq(subjectTable.id, input.id))
        .limit(1);

    if (!subject) {
        return {status: "error", message: "Subject not found."};
    }

    const slug = name === subject.name ? subject.slug : await createUniqueSlug({
        title: name,
        maxLength: SUBJECT_SLUG_MAX_LENGTH,
        fallback: "subject",
        exists: (candidate) => subjectSlugExists(candidate, subject.id),
    });

    try {
        await database
            .update(subjectTable)
            .set({name, slug})
            .where(eq(subjectTable.id, subject.id));

        return {status: "success", message: "Subject updated."};
    } catch {
        return {status: "error", message: "Unable to update the subject right now."};
    }
}

export async function deleteSubject(subjectId: number): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    try {
        await database.delete(subjectTable).where(eq(subjectTable.id, subjectId));

        return {status: "success", message: "Subject deleted. Its topics were removed with it."};
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return {
                status: "error",
                message: "This subject is referenced by a curriculum and cannot be deleted.",
            };
        }

        return {status: "error", message: "Unable to delete the subject right now."};
    }
}

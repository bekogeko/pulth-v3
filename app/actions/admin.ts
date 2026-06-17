"use server";

import {clerkClient} from "@clerk/nextjs/server";
import {and, asc, count, countDistinct, desc, eq, inArray, isNull, ne} from "drizzle-orm";
import {revalidatePath} from "next/cache";

import {
    articleConceptsTable,
    articleTable,
    conceptTable,
    curriculum,
    curriculumConcept,
    curriculumTopic,
    curriculumTopicConcepts,
    questionConceptRatingTable,
    questionConceptsTable,
    questionOptionTable,
    questionTable,
    ratingEventTable,
    subjectTable,
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
const CURRICULUM_LOCAL_FIELD_MAX_LENGTH = 255;
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

    const [articles, publishedArticles, questions, concepts, curriculums, subjects, answers] = await Promise.all([
        countOf(database.select({value: count()}).from(articleTable)),
        countOf(
            database
                .select({value: count()})
                .from(articleTable)
                .where(eq(articleTable.isPublished, true))
        ),
        countOf(database.select({value: count()}).from(questionTable)),
        countOf(database.select({value: count()}).from(conceptTable)),
        countOf(database.select({value: count()}).from(curriculum)),
        countOf(database.select({value: count()}).from(subjectTable)),
        countOf(database.select({value: count()}).from(userAnswerTable)),
    ]);

    return {
        articles,
        publishedArticles,
        questions,
        concepts,
        curriculums,
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

// --- Curriculum concept bindings ---

type CurriculumPathInfo = {
    slug: string;
    subjectSlug: string | null;
    topicSlugs: string[];
};

function isPositiveInteger(value: number) {
    return Number.isInteger(value) && value > 0;
}

function normalizeOptionalAdminText(value: string | null | undefined) {
    const normalized = value?.trim() ?? "";

    return normalized || null;
}

function validateLocalCurriculumText(localName: string | null, localDescription: string | null): AdminMutationState | null {
    if (localName && localName.length > CURRICULUM_LOCAL_FIELD_MAX_LENGTH) {
        return {status: "error", message: "Local name must be 255 characters or fewer."};
    }

    if (localDescription && localDescription.length > CURRICULUM_LOCAL_FIELD_MAX_LENGTH) {
        return {status: "error", message: "Local description must be 255 characters or fewer."};
    }

    return null;
}

async function getCurriculumPathInfo(curriculumId: number): Promise<CurriculumPathInfo | null> {
    const [pathInfo] = await database
        .select({
            slug: curriculum.slug,
            subjectSlug: subjectTable.slug,
        })
        .from(curriculum)
        .leftJoin(subjectTable, eq(curriculum.subjectId, subjectTable.id))
        .where(eq(curriculum.id, curriculumId))
        .limit(1);

    if (!pathInfo) {
        return null;
    }

    const topicSlugs = await database
        .select({slug: curriculumTopic.slug})
        .from(curriculumTopic)
        .where(eq(curriculumTopic.curriculumId, curriculumId));

    return {
        ...pathInfo,
        topicSlugs: topicSlugs.map((topic) => topic.slug),
    };
}

function revalidateCurriculumBindingPaths(pathInfo: CurriculumPathInfo | null) {
    revalidatePath("/admin");
    revalidatePath("/admin/curriculums");

    if (pathInfo?.subjectSlug) {
        revalidatePath(`/${pathInfo.subjectSlug}/${pathInfo.slug}`);

        for (const topicSlug of pathInfo.topicSlugs) {
            revalidatePath(`/${pathInfo.subjectSlug}/${pathInfo.slug}/${topicSlug}`);
        }
    }
}

export async function getAdminCurriculumBindings() {
    if (!(await isAdmin())) {
        return {curriculums: [], concepts: []};
    }

    const [curriculumRows, topicRows, conceptRows, bindingRows, topicBindingRows] = await Promise.all([
        database
            .select({
                id: curriculum.id,
                name: curriculum.name,
                slug: curriculum.slug,
                subjectName: subjectTable.name,
            })
            .from(curriculum)
            .leftJoin(subjectTable, eq(curriculum.subjectId, subjectTable.id))
            .orderBy(asc(subjectTable.name), asc(curriculum.name)),
        database
            .select({
                id: curriculumTopic.id,
                curriculumId: curriculumTopic.curriculumId,
                name: curriculumTopic.name,
                slug: curriculumTopic.slug,
                description: curriculumTopic.description,
                position: curriculumTopic.position,
            })
            .from(curriculumTopic)
            .orderBy(asc(curriculumTopic.curriculumId), asc(curriculumTopic.position), asc(curriculumTopic.id)),
        database
            .select({
                id: conceptTable.id,
                name: conceptTable.name,
                slug: conceptTable.slug,
                description: conceptTable.description,
            })
            .from(conceptTable)
            .orderBy(asc(conceptTable.name)),
        database
            .select({
                curriculumId: curriculumConcept.curriculumId,
                conceptId: curriculumConcept.conceptId,
                localName: curriculumConcept.localName,
                localDescription: curriculumConcept.localDescription,
                name: conceptTable.name,
                slug: conceptTable.slug,
                globalDescription: conceptTable.description,
            })
            .from(curriculumConcept)
            .innerJoin(conceptTable, eq(curriculumConcept.conceptId, conceptTable.id))
            .orderBy(asc(curriculumConcept.curriculumId), asc(conceptTable.name)),
        database
            .select({
                curriculumId: curriculumTopicConcepts.curriculumId,
                curriculumTopicId: curriculumTopicConcepts.curriculumTopicId,
                conceptId: curriculumTopicConcepts.conceptId,
            })
            .from(curriculumTopicConcepts)
            .orderBy(
                asc(curriculumTopicConcepts.curriculumId),
                asc(curriculumTopicConcepts.curriculumTopicId),
                asc(curriculumTopicConcepts.conceptId),
            ),
    ]);

    const topicsByCurriculum = new Map<number, {
        id: number;
        name: string;
        slug: string;
        description: string;
        position: number | null;
        conceptIds: number[];
    }[]>();
    const topicConceptIds = new Map<number, number[]>();
    const topicIdsByCurriculumConcept = new Map<string, number[]>();

    for (const topicBinding of topicBindingRows) {
        const conceptIds = topicConceptIds.get(topicBinding.curriculumTopicId) ?? [];
        conceptIds.push(topicBinding.conceptId);
        topicConceptIds.set(topicBinding.curriculumTopicId, conceptIds);

        const conceptTopicKey = `${topicBinding.curriculumId}:${topicBinding.conceptId}`;
        const topicIds = topicIdsByCurriculumConcept.get(conceptTopicKey) ?? [];
        topicIds.push(topicBinding.curriculumTopicId);
        topicIdsByCurriculumConcept.set(conceptTopicKey, topicIds);
    }

    for (const topic of topicRows) {
        const topics = topicsByCurriculum.get(topic.curriculumId) ?? [];
        topics.push({
            id: topic.id,
            name: topic.name,
            slug: topic.slug,
            description: topic.description,
            position: topic.position,
            conceptIds: topicConceptIds.get(topic.id) ?? [],
        });
        topicsByCurriculum.set(topic.curriculumId, topics);
    }

    const conceptsByCurriculum = new Map<number, {
        id: number;
        name: string;
        slug: string;
        globalDescription: string | null;
        localName: string | null;
        localDescription: string | null;
        topicIds: number[];
    }[]>();

    for (const binding of bindingRows) {
        const concepts = conceptsByCurriculum.get(binding.curriculumId) ?? [];
        concepts.push({
            id: binding.conceptId,
            name: binding.name,
            slug: binding.slug,
            globalDescription: binding.globalDescription,
            localName: binding.localName,
            localDescription: binding.localDescription,
            topicIds: topicIdsByCurriculumConcept.get(`${binding.curriculumId}:${binding.conceptId}`) ?? [],
        });
        conceptsByCurriculum.set(binding.curriculumId, concepts);
    }

    return {
        concepts: conceptRows,
        curriculums: curriculumRows.map((curriculumItem) => ({
            ...curriculumItem,
            topics: topicsByCurriculum.get(curriculumItem.id) ?? [],
            boundConcepts: conceptsByCurriculum.get(curriculumItem.id) ?? [],
        })),
    };
}

export async function adminBindCurriculumConcept(input: {
    curriculumId: number;
    conceptId: number;
    localName?: string | null;
    localDescription?: string | null;
}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    if (!isPositiveInteger(input.curriculumId) || !isPositiveInteger(input.conceptId)) {
        return {status: "error", message: "Choose a curriculum and concept."};
    }

    const localName = normalizeOptionalAdminText(input.localName);
    const localDescription = normalizeOptionalAdminText(input.localDescription);
    const validationError = validateLocalCurriculumText(localName, localDescription);

    if (validationError) {
        return validationError;
    }

    const [pathInfo, concept, existingBinding] = await Promise.all([
        getCurriculumPathInfo(input.curriculumId),
        database
            .select({id: conceptTable.id})
            .from(conceptTable)
            .where(eq(conceptTable.id, input.conceptId))
            .limit(1),
        database
            .select({
                curriculumId: curriculumConcept.curriculumId,
                conceptId: curriculumConcept.conceptId,
            })
            .from(curriculumConcept)
            .where(and(
                eq(curriculumConcept.curriculumId, input.curriculumId),
                eq(curriculumConcept.conceptId, input.conceptId),
            ))
            .limit(1),
    ]);

    if (!pathInfo) {
        return {status: "error", message: "Curriculum not found."};
    }

    if (!concept[0]) {
        return {status: "error", message: "Concept not found."};
    }

    try {
        if (existingBinding[0]) {
            await database
                .update(curriculumConcept)
                .set({localName, localDescription})
                .where(and(
                    eq(curriculumConcept.curriculumId, input.curriculumId),
                    eq(curriculumConcept.conceptId, input.conceptId),
                ));

            revalidateCurriculumBindingPaths(pathInfo);

            return {status: "success", message: "Concept binding updated."};
        }

        await database.insert(curriculumConcept).values({
            curriculumId: input.curriculumId,
            conceptId: input.conceptId,
            localName,
            localDescription,
        });

        revalidateCurriculumBindingPaths(pathInfo);

        return {status: "success", message: "Concept bound to curriculum."};
    } catch {
        return {status: "error", message: "Unable to save the concept binding right now."};
    }
}

export async function adminUnbindCurriculumConcept(input: {
    curriculumId: number;
    conceptId: number;
}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    if (!isPositiveInteger(input.curriculumId) || !isPositiveInteger(input.conceptId)) {
        return {status: "error", message: "Choose a curriculum and concept."};
    }

    const [pathInfo, existingBinding] = await Promise.all([
        getCurriculumPathInfo(input.curriculumId),
        database
            .select({
                curriculumId: curriculumConcept.curriculumId,
                conceptId: curriculumConcept.conceptId,
            })
            .from(curriculumConcept)
            .where(and(
                eq(curriculumConcept.curriculumId, input.curriculumId),
                eq(curriculumConcept.conceptId, input.conceptId),
            ))
            .limit(1),
    ]);

    if (!pathInfo) {
        return {status: "error", message: "Curriculum not found."};
    }

    if (!existingBinding[0]) {
        return {status: "error", message: "Concept binding not found."};
    }

    try {
        await database
            .delete(curriculumConcept)
            .where(and(
                eq(curriculumConcept.curriculumId, input.curriculumId),
                eq(curriculumConcept.conceptId, input.conceptId),
            ));

        revalidateCurriculumBindingPaths(pathInfo);

        return {status: "success", message: "Concept unbound from curriculum."};
    } catch {
        return {status: "error", message: "Unable to remove the concept binding right now."};
    }
}

export async function adminSetCurriculumTopicConcept(input: {
    curriculumId: number;
    curriculumTopicId: number;
    conceptId: number;
    assigned: boolean;
}): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    if (
        !isPositiveInteger(input.curriculumId) ||
        !isPositiveInteger(input.curriculumTopicId) ||
        !isPositiveInteger(input.conceptId)
    ) {
        return {status: "error", message: "Choose a curriculum topic and concept."};
    }

    const [pathInfo, topic] = await Promise.all([
        getCurriculumPathInfo(input.curriculumId),
        database
            .select({id: curriculumTopic.id})
            .from(curriculumTopic)
            .where(and(
                eq(curriculumTopic.id, input.curriculumTopicId),
                eq(curriculumTopic.curriculumId, input.curriculumId),
            ))
            .limit(1),
    ]);

    if (!pathInfo) {
        return {status: "error", message: "Curriculum not found."};
    }

    if (!topic[0]) {
        return {status: "error", message: "Curriculum topic not found."};
    }

    try {
        if (!input.assigned) {
            await database
                .delete(curriculumTopicConcepts)
                .where(and(
                    eq(curriculumTopicConcepts.curriculumId, input.curriculumId),
                    eq(curriculumTopicConcepts.curriculumTopicId, input.curriculumTopicId),
                    eq(curriculumTopicConcepts.conceptId, input.conceptId),
                ));

            revalidateCurriculumBindingPaths(pathInfo);

            return {status: "success", message: "Concept removed from topic."};
        }

        const [binding] = await database
            .select({
                curriculumId: curriculumConcept.curriculumId,
                conceptId: curriculumConcept.conceptId,
            })
            .from(curriculumConcept)
            .where(and(
                eq(curriculumConcept.curriculumId, input.curriculumId),
                eq(curriculumConcept.conceptId, input.conceptId),
            ))
            .limit(1);

        if (!binding) {
            return {status: "error", message: "Bind the concept to this curriculum before assigning it to a topic."};
        }

        const [existingTopicBinding] = await database
            .select({
                curriculumTopicId: curriculumTopicConcepts.curriculumTopicId,
                conceptId: curriculumTopicConcepts.conceptId,
            })
            .from(curriculumTopicConcepts)
            .where(and(
                eq(curriculumTopicConcepts.curriculumId, input.curriculumId),
                eq(curriculumTopicConcepts.curriculumTopicId, input.curriculumTopicId),
                eq(curriculumTopicConcepts.conceptId, input.conceptId),
            ))
            .limit(1);

        if (!existingTopicBinding) {
            await database.insert(curriculumTopicConcepts).values({
                curriculumId: input.curriculumId,
                curriculumTopicId: input.curriculumTopicId,
                conceptId: input.conceptId,
            });
        }

        revalidateCurriculumBindingPaths(pathInfo);

        return {status: "success", message: "Concept assigned to topic."};
    } catch {
        return {status: "error", message: "Unable to update the topic concept binding right now."};
    }
}

// --- Question migration ---

const QUESTION_PROMPT_MAX_LENGTH = 255;
const QUESTION_BODY_MAX_LENGTH = 1024;
const QUESTION_EXPLANATION_MAX_LENGTH = 255;
const QUESTION_OPTION_MAX_LENGTH = 255;
const QUESTION_MIN_OPTIONS = 2;

type AdminMigrateQuestionInput = {
    questionId: number;
    curriculumId: number;
    conceptIds: number[];
    prompt: string;
    body: string;
    explanation: string;
};

// Legacy questions carry no curriculum yet (curriculumId IS NULL). They are
// curated one-by-one in the Migrate tab; setting a curriculum is what makes a
// question live and scoped.
export async function getAdminPendingQuestions() {
    if (!(await isAdmin())) {
        return [];
    }

    const questions = await database
        .select({
            id: questionTable.id,
            question: questionTable.question,
            body: questionTable.body,
            explanation: questionTable.explanation,
            createdAt: questionTable.createdAt,
        })
        .from(questionTable)
        .where(isNull(questionTable.curriculumId))
        .orderBy(asc(questionTable.id));

    if (questions.length === 0) {
        return [];
    }

    const questionIds = questions.map((question) => question.id);

    const [optionRows, conceptRows] = await Promise.all([
        database
            .select({
                questionId: questionOptionTable.questionId,
                id: questionOptionTable.id,
                option: questionOptionTable.option,
                isCorrect: questionOptionTable.isCorrect,
            })
            .from(questionOptionTable)
            .where(inArray(questionOptionTable.questionId, questionIds))
            .orderBy(asc(questionOptionTable.id)),
        database
            .select({
                questionId: questionConceptsTable.questionId,
                id: conceptTable.id,
                name: conceptTable.name,
            })
            .from(questionConceptsTable)
            .innerJoin(conceptTable, eq(questionConceptsTable.conceptId, conceptTable.id))
            .where(inArray(questionConceptsTable.questionId, questionIds))
            .orderBy(asc(conceptTable.name)),
    ]);

    const optionsByQuestion = new Map<number, {id: number; option: string; isCorrect: boolean}[]>();
    for (const option of optionRows) {
        const options = optionsByQuestion.get(option.questionId) ?? [];
        options.push({id: option.id, option: option.option, isCorrect: option.isCorrect});
        optionsByQuestion.set(option.questionId, options);
    }

    const conceptsByQuestion = new Map<number, {id: number; name: string}[]>();
    for (const concept of conceptRows) {
        const concepts = conceptsByQuestion.get(concept.questionId) ?? [];
        concepts.push({id: concept.id, name: concept.name});
        conceptsByQuestion.set(concept.questionId, concepts);
    }

    return questions.map((question) => ({
        ...question,
        options: optionsByQuestion.get(question.id) ?? [],
        concepts: conceptsByQuestion.get(question.id) ?? [],
    }));
}

export async function adminMigrateQuestion(input: AdminMigrateQuestionInput): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    if (!isPositiveInteger(input.questionId)) {
        return {status: "error", message: "Question not found."};
    }

    if (!isPositiveInteger(input.curriculumId)) {
        return {status: "error", message: "Choose a curriculum."};
    }

    const prompt = input.prompt.trim();
    const body = input.body.trim();
    const explanation = input.explanation.trim();

    if (!prompt) {
        return {status: "error", message: "Enter a question prompt."};
    }

    if (prompt.length > QUESTION_PROMPT_MAX_LENGTH) {
        return {status: "error", message: "Prompt must be 255 characters or fewer."};
    }

    if (body.length > QUESTION_BODY_MAX_LENGTH) {
        return {status: "error", message: "Body must be 1024 characters or fewer."};
    }

    if (explanation.length > QUESTION_EXPLANATION_MAX_LENGTH) {
        return {status: "error", message: "Explanation must be 255 characters or fewer."};
    }

    const conceptIds = [...new Set(input.conceptIds)].filter((id) => isPositiveInteger(id));

    if (conceptIds.length === 0) {
        return {status: "error", message: "Select at least one concept."};
    }

    const [question] = await database
        .select({id: questionTable.id, curriculumId: questionTable.curriculumId})
        .from(questionTable)
        .where(eq(questionTable.id, input.questionId))
        .limit(1);

    if (!question) {
        return {status: "error", message: "Question not found."};
    }

    if (question.curriculumId !== null) {
        return {status: "error", message: "This question has already been migrated."};
    }

    const pathInfo = await getCurriculumPathInfo(input.curriculumId);

    if (!pathInfo) {
        return {status: "error", message: "Curriculum not found."};
    }

    // Every chosen concept must be bound to the target curriculum, mirroring the
    // guard in adminSetCurriculumTopicConcept.
    const boundConcepts = await database
        .select({conceptId: curriculumConcept.conceptId})
        .from(curriculumConcept)
        .where(and(
            eq(curriculumConcept.curriculumId, input.curriculumId),
            inArray(curriculumConcept.conceptId, conceptIds),
        ));

    if (boundConcepts.length !== conceptIds.length) {
        return {status: "error", message: "Every concept must be bound to the chosen curriculum."};
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .update(questionTable)
                .set({
                    curriculumId: input.curriculumId,
                    question: prompt,
                    body: body || null,
                    explanation: explanation || null,
                    updatedAt: new Date(),
                })
                .where(eq(questionTable.id, question.id));

            await tx
                .delete(questionConceptsTable)
                .where(eq(questionConceptsTable.questionId, question.id));

            await tx.insert(questionConceptsTable).values(
                conceptIds.map((conceptId) => ({
                    questionId: question.id,
                    conceptId,
                })),
            );
        });

        const conceptSlugs = await database
            .select({slug: conceptTable.slug})
            .from(conceptTable)
            .where(inArray(conceptTable.id, conceptIds));

        revalidateCurriculumBindingPaths(pathInfo);
        revalidatePath("/quiz");

        for (const {slug} of conceptSlugs) {
            revalidatePath(`/quiz/concepts/${slug}`);
            revalidatePath(`/quiz/concepts/${slug}/solve`);
        }

        return {status: "success", message: "Question migrated."};
    } catch {
        return {status: "error", message: "Unable to migrate the question right now."};
    }
}

type AdminCreateQuestionInput = {
    curriculumId: number;
    conceptIds: number[];
    prompt: string;
    body: string;
    explanation: string;
    options: string[];
    correctIndex: number;
};

// Authors a brand-new question already scoped to a curriculum (curriculumId set),
// unlike the Migrate flow which adopts a pre-existing legacy question. Used by the
// admin "Add question" action on the curriculum topic page.
export async function adminCreateQuestion(input: AdminCreateQuestionInput): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    if (!isPositiveInteger(input.curriculumId)) {
        return {status: "error", message: "Choose a curriculum."};
    }

    const prompt = input.prompt.trim();
    const body = input.body.trim();
    const explanation = input.explanation.trim();

    if (!prompt) {
        return {status: "error", message: "Enter a question prompt."};
    }

    if (prompt.length > QUESTION_PROMPT_MAX_LENGTH) {
        return {status: "error", message: "Prompt must be 255 characters or fewer."};
    }

    if (body.length > QUESTION_BODY_MAX_LENGTH) {
        return {status: "error", message: "Body must be 1024 characters or fewer."};
    }

    if (explanation.length > QUESTION_EXPLANATION_MAX_LENGTH) {
        return {status: "error", message: "Explanation must be 255 characters or fewer."};
    }

    const options = input.options.map((option) => option.trim());

    if (options.length < QUESTION_MIN_OPTIONS) {
        return {status: "error", message: "Add at least two answer choices."};
    }

    if (options.some((option) => option.length === 0)) {
        return {status: "error", message: "Answer choices cannot be empty."};
    }

    if (options.some((option) => option.length > QUESTION_OPTION_MAX_LENGTH)) {
        return {status: "error", message: "Each answer choice must be 255 characters or fewer."};
    }

    if (!Number.isInteger(input.correctIndex) || input.correctIndex < 0 || input.correctIndex >= options.length) {
        return {status: "error", message: "Choose the correct answer."};
    }

    const conceptIds = [...new Set(input.conceptIds)].filter((id) => isPositiveInteger(id));

    if (conceptIds.length === 0) {
        return {status: "error", message: "Select at least one concept."};
    }

    const pathInfo = await getCurriculumPathInfo(input.curriculumId);

    if (!pathInfo) {
        return {status: "error", message: "Curriculum not found."};
    }

    // Every chosen concept must be bound to the curriculum, mirroring the guard
    // in adminMigrateQuestion.
    const boundConcepts = await database
        .select({conceptId: curriculumConcept.conceptId})
        .from(curriculumConcept)
        .where(and(
            eq(curriculumConcept.curriculumId, input.curriculumId),
            inArray(curriculumConcept.conceptId, conceptIds),
        ));

    if (boundConcepts.length !== conceptIds.length) {
        return {status: "error", message: "Every concept must be bound to the chosen curriculum."};
    }

    try {
        await database.transaction(async (tx) => {
            const [question] = await tx
                .insert(questionTable)
                .values({
                    question: prompt,
                    body: body || null,
                    explanation: explanation || null,
                    curriculumId: input.curriculumId,
                })
                .returning({id: questionTable.id});

            if (!question) {
                throw new Error("Question insert did not return an id.");
            }

            await tx.insert(questionOptionTable).values(
                options.map((option, index) => ({
                    questionId: question.id,
                    option,
                    isCorrect: index === input.correctIndex,
                })),
            );

            await tx.insert(questionConceptsTable).values(
                conceptIds.map((conceptId) => ({
                    questionId: question.id,
                    conceptId,
                })),
            );
        });

        const conceptSlugs = await database
            .select({slug: conceptTable.slug})
            .from(conceptTable)
            .where(inArray(conceptTable.id, conceptIds));

        revalidateCurriculumBindingPaths(pathInfo);
        revalidatePath("/quiz");

        for (const {slug} of conceptSlugs) {
            revalidatePath(`/quiz/concepts/${slug}`);
            revalidatePath(`/quiz/concepts/${slug}/solve`);
        }

        return {status: "success", message: "Question created."};
    } catch {
        return {status: "error", message: "Unable to create the question right now."};
    }
}

export async function adminDiscardQuestion(questionId: number): Promise<AdminMutationState> {
    if (!(await isAdmin())) {
        return NOT_AUTHORIZED;
    }

    if (!isPositiveInteger(questionId)) {
        return {status: "error", message: "Question not found."};
    }

    const [question] = await database
        .select({id: questionTable.id, curriculumId: questionTable.curriculumId})
        .from(questionTable)
        .where(eq(questionTable.id, questionId))
        .limit(1);

    if (!question) {
        return {status: "error", message: "Question not found."};
    }

    if (question.curriculumId !== null) {
        return {status: "error", message: "Only un-migrated questions can be discarded here."};
    }

    try {
        await database.transaction(async (tx) => {
            // Rating events reference the answers, and answers carry a restrict FK to
            // question options, so they have to be cleared before the question itself.
            await tx
                .delete(ratingEventTable)
                .where(inArray(
                    ratingEventTable.answerId,
                    tx
                        .select({id: userAnswerTable.id})
                        .from(userAnswerTable)
                        .where(eq(userAnswerTable.questionId, questionId)),
                ));

            await tx
                .delete(userAnswerTable)
                .where(eq(userAnswerTable.questionId, questionId));

            await tx
                .delete(questionConceptRatingTable)
                .where(eq(questionConceptRatingTable.questionId, questionId));

            await tx
                .delete(questionConceptsTable)
                .where(eq(questionConceptsTable.questionId, questionId));

            await tx
                .delete(questionOptionTable)
                .where(eq(questionOptionTable.questionId, questionId));

            await tx
                .delete(questionTable)
                .where(eq(questionTable.id, questionId));
        });

        revalidatePath("/admin");

        return {status: "success", message: "Question discarded."};
    } catch {
        return {status: "error", message: "Unable to discard the question right now."};
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
        })
        .from(subjectTable)
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

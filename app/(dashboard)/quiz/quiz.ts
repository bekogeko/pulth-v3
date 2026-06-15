"use server";

import {auth} from "@clerk/nextjs/server";
import {and, asc, count, eq, inArray, sql} from "drizzle-orm";
import {revalidatePath} from "next/cache";

import {
    conceptTable,
    questionConceptRatingTable,
    questionConceptsTable,
    questionOptionTable,
    questionTable,
    ratingEventTable,
    topicConceptsTable,
    topicTable,
    userAnswerTable,
    userConceptRatingTable,
} from "@/db/schema";
import {database} from "@/lib/database";

type ActionStatus = "success" | "error";

type ActionState = {
    status: ActionStatus;
    message: string;
};

type CreateQuestionState = {
    status: "idle" | ActionStatus;
    message?: string;
    resetKey?: string;
};

type UpdateQuestionConceptsInput = {
    questionId: number;
    conceptIds: number[];
};

type UpdateQuestionOptionsInput = {
    questionId: number;
    options: string[];
    correctIndex: number;
};

type DeleteQuestionInput = {
    questionId: number;
};

type SubmitAnswerInput = {
    questionId: number;
    optionId: number;
};

type SubmitAnswerState = ActionState & {
    answerId?: number;
    wasCorrect?: boolean;
};

type QuestionOptionJson = {
    id: number;
    option: string;
    isCorrect: boolean;
};

type ConceptJson = {
    id: number;
    name: string;
    description: string | null;
};

export type SimilarQuestionResult = {
    id: number;
    question: string;
    body: string | null;
    options: (QuestionOptionJson & {score?: number})[];
    score: number;
};

export type QuestionConceptRating = {
    questionId: number;
    conceptId: number;
    name: string;
    userRating: number | null;
    questionRating: number;
};

const DEFAULT_CONCEPT_RATING = 1000;
const RATING_K_FACTOR = 32;

const MAX_QUESTION_LENGTH = 255;
const MAX_BODY_LENGTH = 1024;
const MAX_OPTION_LENGTH = 255;

const MIN_SIMILARITY_QUERY_LENGTH = 8;
const SIMILAR_QUESTION_LIMIT = 8;
const SIMILAR_QUESTION_THRESHOLD = 0.18;

const QUIZ_PATH = "/quiz";
const SELF_QUIZ_PATH = "/quiz/self";

let pgTrgmSchema: string | null | undefined;

function success(message: string): ActionState {
    return {status: "success", message};
}

function error(message: string): ActionState {
    return {status: "error", message};
}

function normalizeComparableText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function quoteSqlIdentifier(identifier: string): string {
    return `"${identifier.replaceAll("\"", "\"\"")}"`;
}

function uniqueIntegerIds(ids: Iterable<number>): number[] {
    return [...new Set(ids)].filter(Number.isInteger);
}

function parseInteger(value: FormDataEntryValue | null): number | null {
    if (value === null) {
        return null;
    }

    const parsedValue = Number.parseInt(String(value), 10);
    return Number.isInteger(parsedValue) ? parsedValue : null;
}

function parseIntegerList(formData: FormData, name: string): number[] {
    return uniqueIntegerIds(
        formData
            .getAll(name)
            .map(parseInteger)
            .filter((value): value is number => value !== null)
    );
}

function parseCorrectOptionIndex(value: FormDataEntryValue | null): number {
    const rawValue = String(value ?? "");
    const indexValue = rawValue.includes("-")
        ? rawValue.split("-").at(-1) ?? ""
        : rawValue;

    return Number.parseInt(indexValue, 10);
}

function normalizeOptions(options: string[]): string[] {
    return options.map((option) => option.trim());
}

function validateOptions(options: string[], correctIndex: number): ActionState | null {
    if (options.length === 0) {
        return error("Add at least one option.");
    }

    if (options.some((option) => option.length === 0)) {
        return error("Options cannot be empty.");
    }

    if (options.some((option) => option.length > MAX_OPTION_LENGTH)) {
        return error(`Each option must be ${MAX_OPTION_LENGTH} characters or fewer.`);
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        return error("Choose the correct option.");
    }

    return null;
}

function jsonArray<T>(value: T[] | null): T[] {
    return Array.isArray(value) ? value : [];
}

async function getAuthenticatedUserId(): Promise<string | null> {
    const {isAuthenticated, userId} = await auth();
    return isAuthenticated && userId ? userId : null;
}

async function getOwnedQuestionId(questionId: number, userId: string): Promise<number | null> {
    if (!Number.isInteger(questionId)) {
        return null;
    }

    const [question] = await database
        .select({id: questionTable.id})
        .from(questionTable)
        .where(and(
            eq(questionTable.id, questionId),
            eq(questionTable.ownerId, userId)
        ))
        .limit(1);

    return question?.id ?? null;
}

async function allConceptsExist(conceptIds: number[]): Promise<boolean> {
    if (conceptIds.length === 0) {
        return true;
    }

    const existingConcepts = await database
        .select({id: conceptTable.id})
        .from(conceptTable)
        .where(inArray(conceptTable.id, conceptIds));

    return existingConcepts.length === conceptIds.length;
}

async function getPgTrgmSchema(): Promise<string | null> {
    if (pgTrgmSchema !== undefined) {
        return pgTrgmSchema;
    }

    const result = await database.execute<{schema: string}>(sql`
        select n.nspname as schema
        from pg_proc p
        inner join pg_namespace n on n.oid = p.pronamespace
        where p.proname = 'similarity'
          and pg_get_function_identity_arguments(p.oid) = 'text, text'
        limit 1
    `);

    pgTrgmSchema = result.rows[0]?.schema ?? null;
    return pgTrgmSchema;
}

function calculateRatingChange(userRating: number, questionRating: number, wasCorrect: boolean) {
    const expectedUserScore = 1 / (1 + 10 ** ((questionRating - userRating) / 400));
    const userScore = wasCorrect ? 1 : 0;
    const userDelta = RATING_K_FACTOR * (userScore - expectedUserScore);

    return {
        newUserRating: userRating + userDelta,
        newQuestionRating: questionRating - userDelta,
    };
}

export async function getAllConcepts() {
    return database
        .select({
            id: conceptTable.id,
            name: conceptTable.name,
            slug: conceptTable.slug,
        })
        .from(conceptTable)
        .orderBy(asc(conceptTable.name));
}

export async function getSimilarQuestions(input: {
    prompt: string;
    body?: string;
    options?: string[];
}): Promise<SimilarQuestionResult[]> {
    const prompt = input.prompt.trim();
    const body = input.body?.trim() ?? "";
    const options = input.options?.map((option) => option.trim()).filter(Boolean) ?? [];
    const searchText = [prompt, body, ...options].filter(Boolean).join(" ");

    if (!await getAuthenticatedUserId() || normalizeComparableText(searchText).length < MIN_SIMILARITY_QUERY_LENGTH) {
        return [];
    }

    const searchQuery = normalizeComparableText(searchText);
    const trigramSchema = await getPgTrgmSchema();

    if (!trigramSchema) {
        return [];
    }

    const trigramSchemaIdentifier = quoteSqlIdentifier(trigramSchema);
    const similarityFunction = sql.raw(`${trigramSchemaIdentifier}.similarity`);
    const wordSimilarityFunction = sql.raw(`${trigramSchemaIdentifier}.word_similarity`);
    const strictWordSimilarityFunction = sql.raw(`${trigramSchemaIdentifier}.strict_word_similarity`);

    type SimilarQuestionRow = Omit<SimilarQuestionResult, "options"> & {
        options: SimilarQuestionResult["options"] | null;
    };

    const result = await database.execute<SimilarQuestionRow>(sql`
        with question_text as (
            select
                q.id,
                q.question,
                q.body,
                lower(q.question) as question_text,
                lower(coalesce(q.body, '')) as body_text,
                lower(coalesce(string_agg(distinct qo.option, ' '), '')) as option_text,
                lower(concat_ws(
                    ' ',
                    q.question,
                    q.body,
                    coalesce(string_agg(distinct qo.option, ' '), '')
                )) as search_text
            from questions q
            left join question_options qo on qo."questionId" = q.id
            group by q.id
        ),
        ranked_questions as (
            select
                id,
                question,
                body,
                greatest(
                    ${similarityFunction}(question_text, ${searchQuery}::text),
                    ${wordSimilarityFunction}(${searchQuery}::text, question_text),
                    ${strictWordSimilarityFunction}(${searchQuery}::text, question_text),
                    ${similarityFunction}(body_text, ${searchQuery}::text),
                    ${wordSimilarityFunction}(${searchQuery}::text, body_text),
                    ${similarityFunction}(option_text, ${searchQuery}::text),
                    ${wordSimilarityFunction}(${searchQuery}::text, option_text),
                    ${similarityFunction}(search_text, ${searchQuery}::text),
                    ${wordSimilarityFunction}(${searchQuery}::text, search_text),
                    ${strictWordSimilarityFunction}(${searchQuery}::text, search_text)
                ) as similarity_score
            from question_text
        )
        select
            rq.id,
            rq.question,
            rq.body,
            coalesce(
                (
                    select json_agg(
                        json_build_object(
                            'id', qo.id,
                            'option', qo.option,
                            'isCorrect', qo."isCorrect",
                            'score', least(100, round(
                                greatest(
                                    ${similarityFunction}(lower(qo.option), ${searchQuery}::text),
                                    ${wordSimilarityFunction}(${searchQuery}::text, lower(qo.option)),
                                    ${strictWordSimilarityFunction}(${searchQuery}::text, lower(qo.option))
                                ) * 100
                            )::int)
                        )
                        order by greatest(
                            ${similarityFunction}(lower(qo.option), ${searchQuery}::text),
                            ${wordSimilarityFunction}(${searchQuery}::text, lower(qo.option)),
                            ${strictWordSimilarityFunction}(${searchQuery}::text, lower(qo.option))
                        ) desc, qo.id
                    )
                    from question_options qo
                    where qo."questionId" = rq.id
                ),
                '[]'::json
            ) as options,
            least(100, round(rq.similarity_score * 100)::int) as score
        from ranked_questions rq
        where rq.similarity_score >= ${SIMILAR_QUESTION_THRESHOLD}
        order by rq.similarity_score desc, rq.id asc
        limit ${SIMILAR_QUESTION_LIMIT}
    `);

    return result.rows.map((row) => ({
        id: Number(row.id),
        question: row.question,
        body: row.body,
        options: jsonArray(row.options),
        score: Number(row.score),
    }));
}

function selectTopicsWithConcepts(topicSlug?: string) {
    type TopicConceptJson = ConceptJson & {
        slug: string;
        questionCount: number;
    };

    const conceptQuestionCountsSq = database
        .select({
            conceptId: questionConceptsTable.conceptId,
            questionCount: count(questionConceptsTable.questionId).as("question_count"),
        })
        .from(questionConceptsTable)
        .groupBy(questionConceptsTable.conceptId)
        .as("concept_question_counts_sq");

    return database
        .select({
            id: topicTable.id,
            slug: topicTable.slug,
            title: topicTable.title,
            description: topicTable.description,
            concepts: sql<TopicConceptJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${conceptTable.id},
                            'slug', ${conceptTable.slug},
                            'name', ${conceptTable.name},
                            'description', ${conceptTable.description},
                            'questionCount', coalesce(${conceptQuestionCountsSq.questionCount}, 0)
                        )
                        order by ${conceptTable.name}
                    ) filter (where ${conceptTable.id} is not null),
                    '[]'::json
                )
            `,
        })
        .from(topicTable)
        .leftJoin(topicConceptsTable, eq(topicTable.id, topicConceptsTable.topicId))
        .leftJoin(conceptTable, eq(topicConceptsTable.conceptId, conceptTable.id))
        .leftJoin(conceptQuestionCountsSq, eq(conceptTable.id, conceptQuestionCountsSq.conceptId))
        .where(topicSlug === undefined ? undefined : eq(topicTable.slug, topicSlug))
        .groupBy(topicTable.id)
        .orderBy(asc(topicTable.title));
}

export async function getAllTopicsWithConcepts() {
    return selectTopicsWithConcepts();
}

export async function getTopicWithConceptsBySlug(slug: string) {
    return selectTopicsWithConcepts(slug);
}

export async function getMyQuestions() {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
        return [];
    }

    const conceptsSq = database
        .select({
            concepts: sql<ConceptJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${conceptTable.id},
                            'name', ${conceptTable.name},
                            'description', ${conceptTable.description}
                        )
                        order by ${conceptTable.id}
                    ),
                    '[]'::json
                )
            `.as("concepts"),
        })
        .from(questionConceptsTable)
        .innerJoin(conceptTable, eq(questionConceptsTable.conceptId, conceptTable.id))
        .where(eq(questionConceptsTable.questionId, questionTable.id))
        .as("concepts_sq");

    const optionsSq = database
        .select({
            options: sql<QuestionOptionJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${questionOptionTable.id},
                            'option', ${questionOptionTable.option},
                            'isCorrect', ${questionOptionTable.isCorrect}
                        )
                        order by ${questionOptionTable.id}
                    ),
                    '[]'::json
                )
            `.as("options"),
        })
        .from(questionOptionTable)
        .where(eq(questionOptionTable.questionId, questionTable.id))
        .as("options_sq");

    return database
        .select({
            id: questionTable.id,
            question: questionTable.question,
            ownerId: questionTable.ownerId,
            body: questionTable.body,
            concepts: sql<ConceptJson[]>`coalesce(${conceptsSq.concepts}, '[]'::json)`,
            options: sql<QuestionOptionJson[]>`coalesce(${optionsSq.options}, '[]'::json)`,
        })
        .from(questionTable)
        .where(eq(questionTable.ownerId, userId))
        .leftJoinLateral(conceptsSq, sql`true`)
        .leftJoinLateral(optionsSq, sql`true`);
}

export async function createQuestion(
    _prevState: CreateQuestionState,
    formData: FormData
): Promise<CreateQuestionState> {
    const prompt = String(formData.get("prompt") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const correctIndex = parseCorrectOptionIndex(formData.get("correctOption"));
    const options = normalizeOptions(formData.getAll("options[]").map(String));
    const conceptIds = parseIntegerList(formData, "conceptIds[]");

    const userId = await getAuthenticatedUserId();

    if (!userId) {
        return error("You must be signed in to create a question.");
    }

    if (!prompt) {
        return error("Enter a prompt.");
    }

    if (prompt.length > MAX_QUESTION_LENGTH) {
        return error(`Prompt must be ${MAX_QUESTION_LENGTH} characters or fewer.`);
    }

    if (body.length > MAX_BODY_LENGTH) {
        return error(`Body must be ${MAX_BODY_LENGTH} characters or fewer.`);
    }

    const optionError = validateOptions(options, correctIndex);

    if (optionError) {
        return optionError;
    }

    if (!await allConceptsExist(conceptIds)) {
        return error("One or more concepts could not be found.");
    }

    try {
        await database.transaction(async (tx) => {
            const [question] = await tx
                .insert(questionTable)
                .values({
                    question: prompt,
                    body: body || null,
                    ownerId: userId,
                })
                .returning({id: questionTable.id});

            if (!question) {
                throw new Error("Question insert did not return an id.");
            }

            await tx.insert(questionOptionTable).values(
                options.map((option, index) => ({
                    questionId: question.id,
                    option,
                    isCorrect: index === correctIndex,
                }))
            );

            if (conceptIds.length > 0) {
                await tx.insert(questionConceptsTable).values(
                    conceptIds.map((conceptId) => ({
                        questionId: question.id,
                        conceptId,
                    }))
                );
            }
        });

        revalidatePath(QUIZ_PATH);
        revalidatePath(SELF_QUIZ_PATH);

        return {
            ...success("Question created."),
            resetKey: crypto.randomUUID(),
        };
    } catch {
        return error("Unable to save the question right now.");
    }
}

export async function updateQuestionConcepts({
    questionId,
    conceptIds,
}: UpdateQuestionConceptsInput): Promise<ActionState> {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
        return error("You must be signed in to update concepts.");
    }

    const ownedQuestionId = await getOwnedQuestionId(questionId, userId);

    if (!ownedQuestionId) {
        return error("Question not found or you do not have access to it.");
    }

    const uniqueConceptIds = uniqueIntegerIds(conceptIds);

    if (!await allConceptsExist(uniqueConceptIds)) {
        return error("One or more concepts could not be found.");
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .delete(questionConceptsTable)
                .where(eq(questionConceptsTable.questionId, ownedQuestionId));

            if (uniqueConceptIds.length > 0) {
                await tx.insert(questionConceptsTable).values(
                    uniqueConceptIds.map((conceptId) => ({
                        questionId: ownedQuestionId,
                        conceptId,
                    }))
                );
            }
        });

        revalidatePath(SELF_QUIZ_PATH);
        return success("Concepts updated.");
    } catch {
        return error("Unable to update concepts right now.");
    }
}

export async function updateQuestionOptions({
    questionId,
    options,
    correctIndex,
}: UpdateQuestionOptionsInput): Promise<ActionState> {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
        return error("You must be signed in to update options.");
    }

    const normalizedOptions = normalizeOptions(options);
    const optionError = validateOptions(normalizedOptions, correctIndex);

    if (optionError) {
        return optionError;
    }

    const ownedQuestionId = await getOwnedQuestionId(questionId, userId);

    if (!ownedQuestionId) {
        return error("Question not found or you do not have access to it.");
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .delete(questionOptionTable)
                .where(eq(questionOptionTable.questionId, ownedQuestionId));

            await tx.insert(questionOptionTable).values(
                normalizedOptions.map((option, index) => ({
                    questionId: ownedQuestionId,
                    option,
                    isCorrect: index === correctIndex,
                }))
            );
        });

        revalidatePath(SELF_QUIZ_PATH);
        return success("Options updated.");
    } catch {
        return error("Unable to update options right now.");
    }
}

export async function deleteQuestion({
    questionId,
}: DeleteQuestionInput): Promise<ActionState> {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
        return error("You must be signed in to delete questions.");
    }

    const ownedQuestionId = await getOwnedQuestionId(questionId, userId);

    if (!ownedQuestionId) {
        return error("Question not found or you do not have access to it.");
    }

    const [submittedAnswer] = await database
        .select({id: userAnswerTable.id})
        .from(userAnswerTable)
        .where(eq(userAnswerTable.questionId, ownedQuestionId))
        .limit(1);

    if (submittedAnswer) {
        return error("This question has submitted answers and cannot be deleted.");
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .delete(questionConceptRatingTable)
                .where(eq(questionConceptRatingTable.questionId, ownedQuestionId));

            await tx
                .delete(questionConceptsTable)
                .where(eq(questionConceptsTable.questionId, ownedQuestionId));

            await tx
                .delete(questionOptionTable)
                .where(eq(questionOptionTable.questionId, ownedQuestionId));

            await tx
                .delete(questionTable)
                .where(and(
                    eq(questionTable.id, ownedQuestionId),
                    eq(questionTable.ownerId, userId)
                ));
        });

        revalidatePath(QUIZ_PATH);
        revalidatePath(SELF_QUIZ_PATH);
        return success("Question deleted.");
    } catch {
        return error("Unable to delete the question right now.");
    }
}

export async function submitUserAnswer({
    questionId,
    optionId,
}: SubmitAnswerInput): Promise<SubmitAnswerState> {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
        return error("You must be signed in to answer questions.");
    }

    if (!Number.isInteger(questionId) || !Number.isInteger(optionId)) {
        return error("Choose an answer before continuing.");
    }

    const [selectedOption] = await database
        .select({
            id: questionOptionTable.id,
            questionId: questionOptionTable.questionId,
            isCorrect: questionOptionTable.isCorrect,
        })
        .from(questionOptionTable)
        .where(eq(questionOptionTable.id, optionId))
        .limit(1);

    if (!selectedOption) {
        return error("Answer option not found.");
    }

    if (selectedOption.questionId !== questionId) {
        return error("Answer option does not belong to this question.");
    }

    const [existingAnswer] = await database
        .select({
            id: userAnswerTable.id,
            wasCorrect: userAnswerTable.wasCorrect,
        })
        .from(userAnswerTable)
        .where(and(
            eq(userAnswerTable.userId, userId),
            eq(userAnswerTable.questionId, questionId)
        ))
        .limit(1);

    if (existingAnswer) {
        return {
            ...success("Answer already recorded."),
            answerId: existingAnswer.id,
            wasCorrect: existingAnswer.wasCorrect,
        };
    }

    try {
        const answer = await database.transaction(async (tx) => {
            const [createdAnswer] = await tx
                .insert(userAnswerTable)
                .values({
                    userId,
                    questionId: selectedOption.questionId,
                    optionId: selectedOption.id,
                    wasCorrect: selectedOption.isCorrect,
                })
                .returning({id: userAnswerTable.id});

            if (!createdAnswer) {
                throw new Error("Answer insert did not return an id.");
            }

            const conceptRows = await tx
                .select({conceptId: questionConceptsTable.conceptId})
                .from(questionConceptsTable)
                .where(eq(questionConceptsTable.questionId, selectedOption.questionId));

            for (const {conceptId} of conceptRows) {
                const [existingUserRating] = await tx
                    .select({
                        id: userConceptRatingTable.id,
                        rating: userConceptRatingTable.rating,
                    })
                    .from(userConceptRatingTable)
                    .where(and(
                        eq(userConceptRatingTable.userId, userId),
                        eq(userConceptRatingTable.conceptId, conceptId)
                    ))
                    .for("update");

                const userRatingRecord = existingUserRating ?? (
                    await tx
                        .insert(userConceptRatingTable)
                        .values({
                            userId,
                            conceptId,
                            rating: DEFAULT_CONCEPT_RATING,
                        })
                        .returning({
                            id: userConceptRatingTable.id,
                            rating: userConceptRatingTable.rating,
                        })
                )[0];

                const [existingQuestionRating] = await tx
                    .select({
                        id: questionConceptRatingTable.id,
                        rating: questionConceptRatingTable.rating,
                    })
                    .from(questionConceptRatingTable)
                    .where(and(
                        eq(questionConceptRatingTable.questionId, selectedOption.questionId),
                        eq(questionConceptRatingTable.conceptId, conceptId)
                    ))
                    .for("update");

                const questionRatingRecord = existingQuestionRating ?? (
                    await tx
                        .insert(questionConceptRatingTable)
                        .values({
                            questionId: selectedOption.questionId,
                            conceptId,
                            rating: DEFAULT_CONCEPT_RATING,
                        })
                        .returning({
                            id: questionConceptRatingTable.id,
                            rating: questionConceptRatingTable.rating,
                        })
                )[0];

                if (!userRatingRecord || !questionRatingRecord) {
                    throw new Error("Unable to load concept ratings.");
                }

                const oldRatingUser = userRatingRecord.rating;
                const oldRatingQuestion = questionRatingRecord.rating;
                const {newUserRating, newQuestionRating} = calculateRatingChange(
                    oldRatingUser,
                    oldRatingQuestion,
                    selectedOption.isCorrect
                );

                await tx
                    .update(userConceptRatingTable)
                    .set({
                        rating: newUserRating,
                        updatedAt: new Date(),
                    })
                    .where(eq(userConceptRatingTable.id, userRatingRecord.id));

                await tx
                    .update(questionConceptRatingTable)
                    .set({
                        rating: newQuestionRating,
                        updatedAt: new Date(),
                    })
                    .where(eq(questionConceptRatingTable.id, questionRatingRecord.id));

                await tx
                    .insert(ratingEventTable)
                    .values({
                        userId,
                        answerId: createdAnswer.id,
                        conceptId,
                        oldRatingUser,
                        newRatingUser: newUserRating,
                        oldRatingQuestion,
                        newRatingQuestion: newQuestionRating,
                    });
            }

            return createdAnswer;
        });

        return {
            ...success("Answer recorded."),
            answerId: answer.id,
            wasCorrect: selectedOption.isCorrect,
        };
    } catch (submitError) {
        console.error("Unable to record user answer", submitError);
        return error("Unable to record your answer right now.");
    }
}

export async function getQuestionConceptRatings(questionIds: number[]): Promise<QuestionConceptRating[]> {
    const uniqueQuestionIds = uniqueIntegerIds(questionIds);

    if (uniqueQuestionIds.length === 0) {
        return [];
    }

    const {userId} = await auth();

    return database
        .select({
            questionId: questionConceptsTable.questionId,
            conceptId: conceptTable.id,
            name: conceptTable.name,
            userRating: userId
                ? sql<number>`coalesce(${userConceptRatingTable.rating}, ${DEFAULT_CONCEPT_RATING})`
                : sql<null>`null`,
            questionRating: sql<number>`coalesce(${questionConceptRatingTable.rating}, ${DEFAULT_CONCEPT_RATING})`,
        })
        .from(questionConceptsTable)
        .innerJoin(conceptTable, eq(questionConceptsTable.conceptId, conceptTable.id))
        .leftJoin(
            questionConceptRatingTable,
            and(
                eq(questionConceptRatingTable.questionId, questionConceptsTable.questionId),
                eq(questionConceptRatingTable.conceptId, questionConceptsTable.conceptId)
            )
        )
        .leftJoin(
            userConceptRatingTable,
            and(
                eq(userConceptRatingTable.conceptId, questionConceptsTable.conceptId),
                eq(userConceptRatingTable.userId, userId ?? "")
            )
        )
        .where(inArray(questionConceptsTable.questionId, uniqueQuestionIds))
        .orderBy(asc(questionConceptsTable.questionId), asc(conceptTable.name));
}

export async function getConceptById(conceptId: number) {
    if (!Number.isInteger(conceptId)) {
        return [];
    }

    return database
        .select()
        .from(conceptTable)
        .where(eq(conceptTable.id, conceptId));
}

export async function getConceptBySlug(slug: string) {
    return database
        .select()
        .from(conceptTable)
        .where(eq(conceptTable.slug, slug));
}

export async function getConceptByIdentifier(identifier: string) {
    if (/^\d+$/.test(identifier)) {
        return getConceptById(Number.parseInt(identifier, 10));
    }

    return getConceptBySlug(identifier);
}

export async function getQuestionsByConceptId(conceptId: number) {
    if (!Number.isInteger(conceptId)) {
        throw new Error("Concept not found");
    }

    const concept = await database
        .select({id: conceptTable.id})
        .from(conceptTable)
        .where(eq(conceptTable.id, conceptId))
        .limit(1)
        .then((results) => results[0]);

    if (!concept) {
        throw new Error("Concept not found");
    }

    return database
        .select({
            questionId: questionTable.id,
            question: questionTable.question,
            body: questionTable.body,
            options: sql<QuestionOptionJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${questionOptionTable.id},
                            'option', ${questionOptionTable.option},
                            'isCorrect', ${questionOptionTable.isCorrect}
                        )
                        order by ${questionOptionTable.id}
                    ) filter (where ${questionOptionTable.id} is not null),
                    '[]'::json
                )
            `,
        })
        .from(questionConceptsTable)
        .innerJoin(questionTable, eq(questionTable.id, questionConceptsTable.questionId))
        .leftJoin(questionOptionTable, eq(questionTable.id, questionOptionTable.questionId))
        .where(eq(questionConceptsTable.conceptId, concept.id))
        .groupBy(
            questionTable.id,
            questionTable.question,
            questionTable.body
        );
}

export async function getQuestionsByTopicSlug(slug: string) {
    const topic = await database
        .select({id: topicTable.id})
        .from(topicTable)
        .where(eq(topicTable.slug, slug))
        .limit(1)
        .then((results) => results[0]);

    if (!topic) {
        throw new Error("Topic not found");
    }

    // A question can belong to several concepts of the same topic, so collapse
    // the concept links before joining options.
    const topicQuestionIdsSq = database
        .selectDistinct({questionId: questionConceptsTable.questionId})
        .from(questionConceptsTable)
        .innerJoin(topicConceptsTable, eq(topicConceptsTable.conceptId, questionConceptsTable.conceptId))
        .where(eq(topicConceptsTable.topicId, topic.id))
        .as("topic_question_ids_sq");

    return database
        .select({
            questionId: questionTable.id,
            question: questionTable.question,
            body: questionTable.body,
            options: sql<QuestionOptionJson[]>`
                coalesce(
                    json_agg(
                        json_build_object(
                            'id', ${questionOptionTable.id},
                            'option', ${questionOptionTable.option},
                            'isCorrect', ${questionOptionTable.isCorrect}
                        )
                        order by ${questionOptionTable.id}
                    ) filter (where ${questionOptionTable.id} is not null),
                    '[]'::json
                )
            `,
        })
        .from(questionTable)
        .innerJoin(topicQuestionIdsSq, eq(questionTable.id, topicQuestionIdsSq.questionId))
        .leftJoin(questionOptionTable, eq(questionTable.id, questionOptionTable.questionId))
        .groupBy(
            questionTable.id,
            questionTable.question,
            questionTable.body
        )
        .orderBy(asc(questionTable.id));
}

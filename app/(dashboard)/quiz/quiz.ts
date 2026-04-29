"use server"
import {database} from "@/lib/database";
import {
    conceptTable,
    questionConceptRatingTable,
    questionConceptsTable as questionConcepts,
    questionOptionTable,
    questionTable,
    ratingEventTable,
    quizQuestionTable as quizQuestion,
    quizTable,
    topicConceptsTable as topicConcepts,
    topicTable,
    userAnswerTable,
    userConceptRatingTable
} from "@/db/schema";
import {revalidatePath} from "next/cache";
import {auth} from "@clerk/nextjs/server";
import {and, asc, count, eq, inArray, sql} from "drizzle-orm";

type CreateQuestionState = {
    status: "idle" | "success" | "error";
    message?: string;
    resetKey?: string;
};

type UpdateQuestionConceptsInput = {
    questionId: number;
    conceptIds: number[];
};

type UpdateQuestionConceptsState = {
    status: "success" | "error";
    message: string;
};

type UpdateQuestionOptionsInput = {
    questionId: number;
    options: string[];
    correctIndex: number;
};

type UpdateQuestionOptionsState = {
    status: "success" | "error";
    message: string;
};

type UpdateQuestionQuizzesInput = {
    questionId: number;
    quizIds: number[];
};

type UpdateQuestionQuizzesState = {
    status: "success" | "error";
    message: string;
};

type DeleteQuestionInput = {
    questionId: number;
};

type DeleteQuestionState = {
    status: "success" | "error";
    message: string;
};

type SubmitAnswerInput = {
    questionId: number;
    optionId: number;
};

type SubmitAnswerState = {
    status: "success" | "error";
    message: string;
    answerId?: number;
    wasCorrect?: boolean;
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

function calculateRatingChange(userRating: number, questionRating: number, wasCorrect: boolean) {
    const expectedUserScore = 1 / (1 + 10 ** ((questionRating - userRating) / 400));
    const userScore = wasCorrect ? 1 : 0;
    const userDelta = RATING_K_FACTOR * (userScore - expectedUserScore);

    return {
        newUserRating: userRating + userDelta,
        newQuestionRating: questionRating - userDelta,
    };
}

export async function getAllQuizzes (){
    return database
        .select({
            id: quizTable.id,
            slug: quizTable.slug,
            title:quizTable.title,
            description:quizTable.description,
            questionCount: count(quizQuestion.quizId),
        })
        .from(quizTable)
        .leftJoin(quizQuestion, eq(quizTable.id, quizQuestion.quizId))
        .groupBy(quizTable.id)
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

export async function getAllTopicsWithConcepts() {
    type ConceptJson = {
        id: number;
        slug: string;
        name: string;
        description: string | null;
        questionCount: number;
    };

    const conceptQuestionCountsSq = database
        .select({
            conceptId: questionConcepts.conceptId,
            questionCount: count(questionConcepts.questionId).as("question_count"),
        })
        .from(questionConcepts)
        .groupBy(questionConcepts.conceptId)
        .as("concept_question_counts_sq");

    return database
        .select({
            id: topicTable.id,
            slug: topicTable.slug,
            title: topicTable.title,
            description: topicTable.description,
            concepts: sql<ConceptJson[]>`
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
                    ) FILTER (WHERE ${conceptTable.id} IS NOT NULL),
                    '[]'::json
                )
            `,
        })
        .from(topicTable)
        .leftJoin(topicConcepts, eq(topicTable.id, topicConcepts.topicId))
        .leftJoin(conceptTable, eq(topicConcepts.conceptId, conceptTable.id))
        .leftJoin(conceptQuestionCountsSq, eq(conceptTable.id, conceptQuestionCountsSq.conceptId))
        .groupBy(topicTable.id)
        .orderBy(asc(topicTable.title));
}

export async function getMyQuestions (){
    const {isAuthenticated,userId} = await auth();

    if(!isAuthenticated){
        // bad req
        return [];
    }


    type ConceptJson = {
        id: number;
        name: string;
        description: string | null;
    };

    type QuizJson = {
        id: number;
        title: string;
        description: string;
    };

    type OptionJson = {
        id: number;
        option: string;
        isCorrect: boolean;
    };

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
        .from(questionConcepts)
        .innerJoin(
            conceptTable,
            eq(questionConcepts.conceptId, conceptTable.id)
        )
        .where(eq(questionConcepts.questionId, questionTable.id))
        .as("concepts_sq");


    const quizzesSq = database
        .select({
            quizzes: sql<QuizJson[]>`
        coalesce(
          json_agg(
            json_build_object(
              'id', ${quizTable.id},
              'title', ${quizTable.title},
              'description', ${quizTable.description}
            )
            order by ${quizTable.id}
          ),
          '[]'::json
        )
      `.as("quizzes"),
        })
        .from(quizQuestion)
        .innerJoin(quizTable, eq(quizQuestion.quizId, quizTable.id))
        .where(eq(quizQuestion.questionId, questionTable.id))
        .as("quizzes_sq");


    const optionsSq = database
        .select({
            options: sql<OptionJson[]>`
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


    const rows = await database
        .select({
            id: questionTable.id,
            question: questionTable.question,
            ownerId: questionTable.ownerId,
            body: questionTable.body,

            concepts: sql<ConceptJson[]>`coalesce(${conceptsSq.concepts}, '[]'::json)`,
            quizzes: sql<QuizJson[]>`coalesce(${quizzesSq.quizzes}, '[]'::json)`,
            options: sql<OptionJson[]>`coalesce(${optionsSq.options}, '[]'::json)`,
        })
        .from(questionTable).where(eq(questionTable.ownerId, userId))
        .leftJoinLateral(conceptsSq, sql`true`)
        .leftJoinLateral(quizzesSq, sql`true`)
        .leftJoinLateral(optionsSq, sql`true`);

    return rows;
}

export async function createQuestion(_prevState: CreateQuestionState, formData: FormData): Promise<CreateQuestionState> {
    const prompt = String(formData.get("prompt") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const correctOption = String(formData.get("correctOption") ?? "");
    const options = formData.getAll("options[]").map((option) => String(option).trim());
    const parsedCorrectIndex = Number.parseInt(
        correctOption.includes("-")
            ? correctOption.split("-")[1] ?? ""
            : correctOption,
        10
    );
    const quizIds = [...new Set([
        ...formData
            .getAll("quizIds[]")
            .map((quizId) => Number.parseInt(String(quizId), 10))
            .filter((quizId) => Number.isInteger(quizId)),
        ...(
            formData.get("quizId")
                ? [Number.parseInt(String(formData.get("quizId")), 10)]
                : []
        ),
    ])];
    const conceptIds = [...new Set(
        formData
            .getAll("conceptIds[]")
            .map((conceptId) => Number.parseInt(String(conceptId), 10))
            .filter((conceptId) => Number.isInteger(conceptId))
    )];

    const { isAuthenticated,userId } = await auth();

    if(!isAuthenticated){
        return {status: "error", message: "You must be signed in to create a question."};
    }

    if (!prompt) {
        return {status: "error", message: "Enter a prompt."};
    }

    if (prompt.length > 255) {
        return {status: "error", message: "Prompt must be 255 characters or fewer."};
    }

    if (body.length > 1024) {
        return {status: "error", message: "Body must be 1024 characters or fewer."};
    }

    if (options.length === 0) {
        return {status: "error", message: "Add at least one option."};
    }

    if (options.some((option) => option.length === 0)) {
        return {status: "error", message: "Options cannot be empty."};
    }

    if (options.some((option) => option.length > 255)) {
        return {status: "error", message: "Each option must be 255 characters or fewer."};
    }

    if (!Number.isInteger(parsedCorrectIndex) || parsedCorrectIndex < 0 || parsedCorrectIndex >= options.length) {
        return {status: "error", message: "Choose the correct option."};
    }

    if (quizIds.length > 0) {
        const existingQuizzes = await database
            .select({id: quizTable.id})
            .from(quizTable)
            .where(inArray(quizTable.id, quizIds));

        if (existingQuizzes.length !== quizIds.length) {
            return {status: "error", message: "One or more quizzes could not be found."};
        }
    }

    if (conceptIds.length > 0) {
        const existingConcepts = await database
            .select({id: conceptTable.id})
            .from(conceptTable)
            .where(inArray(conceptTable.id, conceptIds));

        if (existingConcepts.length !== conceptIds.length) {
            return {status: "error", message: "One or more concepts could not be found."};
        }
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

            if (quizIds.length > 0) {
                await tx.insert(quizQuestion).values(
                    quizIds.map((quizId) => ({
                        quizId,
                        questionId: question.id,
                    }))
                );
            }

            await tx.insert(questionOptionTable).values(
                options.map((option, idx) => ({
                    questionId: question.id,
                    option,
                    isCorrect: idx === parsedCorrectIndex,
                }))
            );

            if (conceptIds.length > 0) {
                await tx.insert(questionConcepts).values(
                    conceptIds.map((conceptId) => ({
                        questionId: question.id,
                        conceptId,
                    }))
                );
            }
        });

        revalidatePath("/quiz");
        revalidatePath("/quiz/self");

        return {
            status: "success",
            message: "Question created.",
            resetKey: crypto.randomUUID(),
        };
    } catch {
        return {status: "error", message: "Unable to save the question right now."};
    }
}

export async function updateQuestionConcepts({
    questionId,
    conceptIds,
}: UpdateQuestionConceptsInput): Promise<UpdateQuestionConceptsState> {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {
            status: "error",
            message: "You must be signed in to update concepts.",
        };
    }

    if (!Number.isInteger(questionId)) {
        return {
            status: "error",
            message: "Question not found.",
        };
    }

    const uniqueConceptIds = [...new Set(conceptIds)]
        .filter((conceptId) => Number.isInteger(conceptId));

    const [ownedQuestion] = await database
        .select({id: questionTable.id})
        .from(questionTable)
        .where(and(
            eq(questionTable.id, questionId),
            eq(questionTable.ownerId, userId),
        ))
        .limit(1);

    if (!ownedQuestion) {
        return {
            status: "error",
            message: "Question not found or you do not have access to it.",
        };
    }

    if (uniqueConceptIds.length > 0) {
        const existingConcepts = await database
            .select({id: conceptTable.id})
            .from(conceptTable)
            .where(inArray(conceptTable.id, uniqueConceptIds));

        if (existingConcepts.length !== uniqueConceptIds.length) {
            return {
                status: "error",
                message: "One or more concepts could not be found.",
            };
        }
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .delete(questionConcepts)
                .where(eq(questionConcepts.questionId, questionId));

            if (uniqueConceptIds.length > 0) {
                await tx.insert(questionConcepts).values(
                    uniqueConceptIds.map((conceptId) => ({
                        questionId,
                        conceptId,
                    }))
                );
            }
        });

        revalidatePath("/quiz/self");

        return {
            status: "success",
            message: "Concepts updated.",
        };
    } catch {
        return {
            status: "error",
            message: "Unable to update concepts right now.",
        };
    }
}

export async function updateQuestionOptions({
    questionId,
    options,
    correctIndex,
}: UpdateQuestionOptionsInput): Promise<UpdateQuestionOptionsState> {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {
            status: "error",
            message: "You must be signed in to update options.",
        };
    }

    if (!Number.isInteger(questionId)) {
        return {
            status: "error",
            message: "Question not found.",
        };
    }

    const normalizedOptions = options.map((option) => option.trim());

    if (normalizedOptions.length === 0) {
        return {
            status: "error",
            message: "Add at least one option.",
        };
    }

    if (normalizedOptions.some((option) => option.length === 0)) {
        return {
            status: "error",
            message: "Options cannot be empty.",
        };
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= normalizedOptions.length) {
        return {
            status: "error",
            message: "Choose the correct option.",
        };
    }

    const [ownedQuestion] = await database
        .select({id: questionTable.id})
        .from(questionTable)
        .where(and(
            eq(questionTable.id, questionId),
            eq(questionTable.ownerId, userId),
        ))
        .limit(1);

    if (!ownedQuestion) {
        return {
            status: "error",
            message: "Question not found or you do not have access to it.",
        };
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .delete(questionOptionTable)
                .where(eq(questionOptionTable.questionId, questionId));

            await tx.insert(questionOptionTable).values(
                normalizedOptions.map((option, index) => ({
                    questionId,
                    option,
                    isCorrect: index === correctIndex,
                }))
            );
        });

        revalidatePath("/quiz/self");

        return {
            status: "success",
            message: "Options updated.",
        };
    } catch {
        return {
            status: "error",
            message: "Unable to update options right now.",
        };
    }
}

export async function updateQuestionQuizzes({
    questionId,
    quizIds,
}: UpdateQuestionQuizzesInput): Promise<UpdateQuestionQuizzesState> {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {
            status: "error",
            message: "You must be signed in to update quizzes.",
        };
    }

    if (!Number.isInteger(questionId)) {
        return {
            status: "error",
            message: "Question not found.",
        };
    }

    const uniqueQuizIds = [...new Set(quizIds)]
        .filter((quizId) => Number.isInteger(quizId));

    const [ownedQuestion] = await database
        .select({id: questionTable.id})
        .from(questionTable)
        .where(and(
            eq(questionTable.id, questionId),
            eq(questionTable.ownerId, userId),
        ))
        .limit(1);

    if (!ownedQuestion) {
        return {
            status: "error",
            message: "Question not found or you do not have access to it.",
        };
    }

    if (uniqueQuizIds.length > 0) {
        const existingQuizzes = await database
            .select({id: quizTable.id})
            .from(quizTable)
            .where(inArray(quizTable.id, uniqueQuizIds));

        if (existingQuizzes.length !== uniqueQuizIds.length) {
            return {
                status: "error",
                message: "One or more quizzes could not be found.",
            };
        }
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .delete(quizQuestion)
                .where(eq(quizQuestion.questionId, questionId));

            if (uniqueQuizIds.length > 0) {
                await tx.insert(quizQuestion).values(
                    uniqueQuizIds.map((quizId) => ({
                        questionId,
                        quizId,
                    }))
                );
            }
        });

        revalidatePath("/quiz");
        revalidatePath("/quiz/self");

        return {
            status: "success",
            message: "Quizzes updated.",
        };
    } catch {
        return {
            status: "error",
            message: "Unable to update quizzes right now.",
        };
    }
}

export async function deleteQuestion({
    questionId,
}: DeleteQuestionInput): Promise<DeleteQuestionState> {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {
            status: "error",
            message: "You must be signed in to delete questions.",
        };
    }

    if (!Number.isInteger(questionId)) {
        return {
            status: "error",
            message: "Question not found.",
        };
    }

    const [ownedQuestion] = await database
        .select({id: questionTable.id})
        .from(questionTable)
        .where(and(
            eq(questionTable.id, questionId),
            eq(questionTable.ownerId, userId),
        ))
        .limit(1);

    if (!ownedQuestion) {
        return {
            status: "error",
            message: "Question not found or you do not have access to it.",
        };
    }

    const [submittedAnswer] = await database
        .select({id: userAnswerTable.id})
        .from(userAnswerTable)
        .where(eq(userAnswerTable.questionId, questionId))
        .limit(1);

    if (submittedAnswer) {
        return {
            status: "error",
            message: "This question has submitted answers and cannot be deleted.",
        };
    }

    try {
        await database.transaction(async (tx) => {
            await tx
                .delete(questionConceptRatingTable)
                .where(eq(questionConceptRatingTable.questionId, questionId));

            await tx
                .delete(quizQuestion)
                .where(eq(quizQuestion.questionId, questionId));

            await tx
                .delete(questionConcepts)
                .where(eq(questionConcepts.questionId, questionId));

            await tx
                .delete(questionOptionTable)
                .where(eq(questionOptionTable.questionId, questionId));

            await tx
                .delete(questionTable)
                .where(and(
                    eq(questionTable.id, questionId),
                    eq(questionTable.ownerId, userId),
                ));
        });

        revalidatePath("/quiz");
        revalidatePath("/quiz/self");

        return {
            status: "success",
            message: "Question deleted.",
        };
    } catch {
        return {
            status: "error",
            message: "Unable to delete the question right now.",
        };
    }
}

export async function submitUserAnswer({
    questionId,
    optionId,
}: SubmitAnswerInput): Promise<SubmitAnswerState> {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return {
            status: "error",
            message: "You must be signed in to answer questions.",
        };
    }

    if (!Number.isInteger(questionId) || !Number.isInteger(optionId)) {
        return {
            status: "error",
            message: "Choose an answer before continuing.",
        };
    }

    //
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
        return {
            status: "error",
            message: "Answer option not found.",
        };
    }

    if (selectedOption.questionId !== questionId) {
        return {
            status: "error",
            message: "Answer option does not belong to this question.",
        };
    }

    const [existingAnswer] = await database
        .select({
            id: userAnswerTable.id,
            wasCorrect: userAnswerTable.wasCorrect,
        })
        .from(userAnswerTable)
        .where(and(
            eq(userAnswerTable.userId, userId),
            eq(userAnswerTable.questionId, questionId),
        ))
        .limit(1);

    if (existingAnswer) {
        return {
            status: "success",
            message: "Answer already recorded.",
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
                .returning({
                    id: userAnswerTable.id,
                });

            const conceptRows = await tx
                .select({
                    conceptId: questionConcepts.conceptId,
                })
                .from(questionConcepts)
                .where(eq(questionConcepts.questionId, selectedOption.questionId));

            for (const {conceptId} of conceptRows) {
                const [existingUserRating] = await tx
                    .select({
                        id: userConceptRatingTable.id,
                        rating: userConceptRatingTable.rating,
                    })
                    .from(userConceptRatingTable)
                    .where(and(
                        eq(userConceptRatingTable.userId, userId),
                        eq(userConceptRatingTable.conceptId, conceptId),
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
                        eq(questionConceptRatingTable.conceptId, conceptId),
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
                    selectedOption.isCorrect,
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
            status: "success",
            message: "Answer recorded.",
            answerId: answer.id,
            wasCorrect: selectedOption.isCorrect,
        };
    } catch (error) {
        console.error("Unable to record user answer", error);

        return {
            status: "error",
            message: "Unable to record your answer right now.",
        };
    }
}

export async function getQuestionConceptRatings(questionIds: number[]): Promise<QuestionConceptRating[]> {
    const uniqueQuestionIds = [...new Set(questionIds)]
        .filter((questionId) => Number.isInteger(questionId));

    if (uniqueQuestionIds.length === 0) {
        return [];
    }

    const {userId} = await auth();

    return database
        .select({
            questionId: questionConcepts.questionId,
            conceptId: conceptTable.id,
            name: conceptTable.name,
            userRating: userId
                ? sql<number>`coalesce(${userConceptRatingTable.rating}, ${DEFAULT_CONCEPT_RATING})`
                : sql<null>`null`,
            questionRating: sql<number>`coalesce(${questionConceptRatingTable.rating}, ${DEFAULT_CONCEPT_RATING})`,
        })
        .from(questionConcepts)
        .innerJoin(conceptTable, eq(questionConcepts.conceptId, conceptTable.id))
        .leftJoin(
            questionConceptRatingTable,
            and(
                eq(questionConceptRatingTable.questionId, questionConcepts.questionId),
                eq(questionConceptRatingTable.conceptId, questionConcepts.conceptId),
            )
        )
        .leftJoin(
            userConceptRatingTable,
            and(
                eq(userConceptRatingTable.conceptId, questionConcepts.conceptId),
                eq(userConceptRatingTable.userId, userId ?? ""),
            )
        )
        .where(inArray(questionConcepts.questionId, uniqueQuestionIds))
        .orderBy(asc(questionConcepts.questionId), asc(conceptTable.name));
}

export async function getQuizBySlug(slug: string){
    return database
        .select()
        .from(quizTable)
        .where(eq(quizTable.slug, slug))
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

export async function getQuestionsBySlug(slug: string){
    const quiz = await database
        .select({id: quizTable.id})
        .from(quizTable)
        .where(eq(quizTable.slug, slug))
        .limit(1)
        .then((results) => results[0]);

    if (!quiz) {
        throw new Error("Quiz not found");
    }

    return database.select({
        quizId: quizQuestion.quizId,
        questionId: quizQuestion.questionId,
        question: questionTable.question,
        body:questionTable.body,
        options: sql<{id:number,option:string,isCorrect:boolean}[]>`json_agg(
        json_build_object(
            'id', ${questionOptionTable.id},
            'option', ${questionOptionTable.option},
            'isCorrect', ${questionOptionTable.isCorrect}
            )
            ) FILTER (WHERE ${questionOptionTable.id} IS NOT NULL)`,
    }).from(quizQuestion)
        .innerJoin(questionTable, eq(questionTable.id, quizQuestion.questionId))
        .leftJoin(questionOptionTable, eq(questionTable.id, questionOptionTable.questionId))
        .where(eq(quizQuestion.quizId, quiz.id))
        .groupBy(
            quizQuestion.quizId,
            quizQuestion.questionId,
            questionTable.id,
            questionTable.question
        )
}

export async function getQuestionsByConceptId(conceptId: number){
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

    return database.select({
        questionId: questionTable.id,
        question: questionTable.question,
        body: questionTable.body,
        options: sql<{id:number,option:string,isCorrect:boolean}[]>`
            coalesce(
                json_agg(
                    json_build_object(
                        'id', ${questionOptionTable.id},
                        'option', ${questionOptionTable.option},
                        'isCorrect', ${questionOptionTable.isCorrect}
                    )
                    order by ${questionOptionTable.id}
                ) FILTER (WHERE ${questionOptionTable.id} IS NOT NULL),
                '[]'::json
            )
        `,
    }).from(questionConcepts)
        .innerJoin(questionTable, eq(questionTable.id, questionConcepts.questionId))
        .leftJoin(questionOptionTable, eq(questionTable.id, questionOptionTable.questionId))
        .where(eq(questionConcepts.conceptId, concept.id))
        .groupBy(
            questionTable.id,
            questionTable.question,
            questionTable.body
        )
}

export async function getQuizzesByQuestionId(questionId: number){
    return database
        .select({
            id: quizTable.id,
            title: quizTable.title,
            description: quizTable.description,
        })
        .from(quizQuestion)
        .innerJoin(quizTable, eq(quizQuestion.quizId, quizTable.id))
        .where(eq(quizQuestion.questionId, questionId));
}

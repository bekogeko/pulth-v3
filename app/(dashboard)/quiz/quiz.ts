"use server"
import {database} from "@/lib/database";
import {conceptTable, questionConcepts, questionOptionTable, questionTable, quizQuestion, quizTable} from "@/db/schema";
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
        })
        .from(conceptTable)
        .orderBy(asc(conceptTable.name));
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
        .from(questionTable)
        .leftJoinLateral(conceptsSq, sql`true`)
        .leftJoinLateral(quizzesSq, sql`true`)
        .leftJoinLateral(optionsSq, sql`true`);

    return rows;
}

export async function createQuestion(_prevState: CreateQuestionState, formData: FormData): Promise<CreateQuestionState> {
    const quizId = Number(formData.get("quizId"));
    const prompt = String(formData.get("prompt") ?? "").trim();
    const correctOption = String(formData.get("correctOption") ?? "");
    const options = formData.getAll("options[]").map((option) => String(option).trim());

    const correctIndex = Number(correctOption.split("-")[1]);

    const { isAuthenticated,userId } = await auth();

    if(!isAuthenticated){
        return {status: "error", message: "You must be signed in to create a question."};
    }

    if (!Number.isInteger(quizId)) {
        return {status: "error", message: "Choose a quiz."};
    }

    if (!prompt) {
        return {status: "error", message: "Enter a prompt."};
    }

    if (options.length === 0) {
        return {status: "error", message: "Add at least one option."};
    }

    if (options.some((option) => option.length === 0)) {
        return {status: "error", message: "Options cannot be empty."};
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        return {status: "error", message: "Choose the correct option."};
    }

    try {
        const [question] = await database
            .insert(questionTable)
            .values({
                question: prompt,
                ownerId: userId,
            })
            .returning({id: questionTable.id});

        database.insert(quizQuestion).values({
            quizId: quizId,
            questionId: question.id,
        });

        await database.insert(questionOptionTable).values(
            options.map((option, idx) => ({
                questionId: question.id,
                option,
                isCorrect: idx === correctIndex,
            }))
        );

        revalidatePath("/quiz");

        return {status: "success", resetKey: crypto.randomUUID()};
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

export async function getQuizBySlug(slug: string){
    return database
        .select()
        .from(quizTable)
        .where(eq(quizTable.slug, slug))
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

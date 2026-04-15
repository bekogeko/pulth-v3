"use server"
import {database} from "@/lib/database";
import {questionOptionTable, questionTable, quizQuestion, quizTable} from "@/db/schema";
import {revalidatePath} from "next/cache";
import {auth} from "@clerk/nextjs/server";
import {count, eq, sql} from "drizzle-orm";

type CreateQuestionState = {
    status: "idle" | "success" | "error";
    message?: string;
    resetKey?: string;
};

export async function getAllQuizzes (){
    // return database
    //     .select({
    //         id: quizTable.id,
    //         slug: quizTable.slug,
    //         title: quizTable.title,
    //         description: quizTable.description,
    //         questionCount: count(questionTable.id),
    //     })
    //     .from(quizTable)
    //     .leftJoin(questionTable, eq(quizTable.id, questionTable.quizId))
    //     .groupBy(quizTable.id, quizTable.slug, quizTable.title, quizTable.description);
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

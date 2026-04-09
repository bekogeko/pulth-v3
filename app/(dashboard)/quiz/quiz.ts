"use server"
import {database} from "@/lib/database";
import {questionOptionTable, questionTable, quizTable} from "@/db/schema";
import {revalidatePath} from "next/cache";
import {auth} from "@clerk/nextjs/server";
import {count, eq} from "drizzle-orm";

type CreateQuestionState = {
    status: "idle" | "success" | "error";
    message?: string;
    resetKey?: string;
};

export async function getAllQuizzes (){
    return database
        .select({
            id: quizTable.id,
            slug: quizTable.slug,
            title: quizTable.title,
            description: quizTable.description,
            questionCount: count(questionTable.id),
        })
        .from(quizTable)
        .leftJoin(questionTable, eq(quizTable.id, questionTable.quizId))
        .groupBy(quizTable.id, quizTable.slug, quizTable.title, quizTable.description);
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
                quizId:quizId,
                question: prompt,
                ownerId: userId,
            })
            .returning({id: questionTable.id});

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

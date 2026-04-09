import { boolean, integer, pgTable, varchar,date } from "drizzle-orm/pg-core";



export const quizTable = pgTable("quizzes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 127 }).notNull(),
});

export const questionTable = pgTable("questions", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    quizId: integer().references(()=>quizTable.id),
    question: varchar({ length: 255 }).notNull(),
    ownerId: varchar({length:255}).notNull(),
})

export const questionOptionTable = pgTable("question_options", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    option: varchar({ length: 255 }).notNull(),
    questionId: integer().references(()=>questionTable.id),
    isCorrect: boolean().notNull().default(false),
})
export type Quiz = typeof quizTable.$inferSelect;
export type Question = typeof questionTable.$inferSelect;


export type QuestionOption = typeof questionOptionTable.$inferSelect;

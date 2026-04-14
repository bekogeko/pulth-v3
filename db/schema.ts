import {boolean, integer, pgTable, varchar, date, primaryKey} from "drizzle-orm/pg-core";


export const quizTable = pgTable("quizzes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 127 }).unique().notNull(),
});

export const questionTable = pgTable("questions", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    question: varchar({ length: 255 }).notNull(),
    body: varchar({ length: 255 }),
    ownerId: varchar({length:255}).notNull(),
})

export const quizQuestion = pgTable("quiz_questions", {
    quizId: integer().references(()=>quizTable.id),
    questionId: integer().references(()=>questionTable.id),
},(t)=>({
    pk:primaryKey({columns:[t.quizId,t.questionId]}),
}))

export const questionOptionTable = pgTable("question_options", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    option: varchar({ length: 255 }).notNull(),
    questionId: integer().references(()=>questionTable.id),
    isCorrect: boolean().notNull().default(false),
})

export const conceptTable = pgTable("concepts", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
})

export const questionConcepts = pgTable("question_concepts", {
    questionId: integer().references(()=>questionTable.id),
    conceptId: integer().references(()=>conceptTable.id),
},(t)=>({
    pk: primaryKey({columns:[t.questionId,t.conceptId]}),
}))
export const subjectTable = pgTable("subjects", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
});

export const topicTable = pgTable("topics", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer().references(()=>subjectTable.id),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 127 }).unique().notNull(),
});

export const topicConcepts = pgTable("topic_concepts", {
    topicId: integer().references(()=>topicTable.id),
    conceptId: integer().references(()=>conceptTable.id),
},(t)=>({
    pk: primaryKey({columns:[t.topicId,t.conceptId]})
}))

export const userAnswerTable = pgTable("user_answers", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar({ length: 255 }).notNull(),
    questionId: integer().references(()=>questionTable.id),
    isCorrect: boolean().notNull().default(false),
    createdAt: date().defaultNow().notNull(),
});
import {
    boolean,
    integer,
    jsonb,
    pgTable,
    text,
    varchar,
    primaryKey,
    timestamp,
    uniqueIndex,
    unique,
    foreignKey, doublePrecision,
    index,
} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import type {EditorJsOutput} from "@/schemas/EditorTypes";



export const articleTable = pgTable("articles", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    authorId: varchar("author_id", { length: 255 }).notNull(),

    title: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    slug: varchar({ length: 255 }).unique().notNull(),

    body: jsonb().$type<EditorJsOutput>().notNull(),
    draftBody: jsonb("draft_body").$type<EditorJsOutput>(),

    isPublished: boolean("is_published").default(false).notNull(),
    publishedAt: timestamp("published_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    authorIdx: index("articles_author_id_idx").on(t.authorId),
    publishedIdx: index("articles_is_published_idx").on(t.isPublished),
}));

export const questionTable = pgTable("questions", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    question: varchar({ length: 255 }).notNull(),
    body: varchar({ length: 1024 }),
    explanation: varchar({ length: 255 }),

    // Owning curriculum. NULL = legacy question pending one-by-one migration
    // (hidden from the question bank); set = live and scoped to this curriculum.
    curriculumId: integer().references(() => curriculum.id, { onDelete: "cascade" }),

    // Abandoned ownership. Kept nullable so admin-authored questions don't need
    // it and legacy values stay readable during migration; dropped afterwards.
    ownerId: varchar({ length: 255 }),

    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
})

export const questionOptionTable = pgTable("question_options", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    option: varchar({ length: 255 }).notNull(),
    questionId: integer().references(()=>questionTable.id,{
        onDelete: "cascade"
    }).notNull(),
    isCorrect: boolean().notNull().default(false),
},(t)=>({
    oneCorrectOptionPerQuestion: uniqueIndex("one_correct_option_per_question_idx")
        .on(t.questionId)
        .where(sql`${t.isCorrect} = true`),
    questionOptionUnique: unique().on(t.questionId, t.id),
}))

export const conceptTable = pgTable("concepts", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).unique().notNull(),
    description: varchar({ length: 255 }),
})

export const questionConceptsTable = pgTable("question_concepts", {
    questionId: integer().references(()=>questionTable.id,{onDelete:"cascade"}).notNull(),
    conceptId: integer().references(()=>conceptTable.id,{onDelete:"cascade"}).notNull(),
},(t)=>({
    pk: primaryKey({columns:[t.questionId,t.conceptId]}),
}))
export const subjectTable = pgTable("subjects", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).unique().notNull(),
});

export const articleConceptsTable = pgTable("article_concepts", {
    articleId: integer("article_id").references(() => articleTable.id, {onDelete: "cascade"}).notNull(),
    conceptId: integer("concept_id").references(() => conceptTable.id, {onDelete: "cascade"}).notNull(),
}, (t) => ({
    pk: primaryKey({columns: [t.articleId, t.conceptId]}),
}));


/// Snapshot of user answer. immutable
export const userAnswerTable = pgTable("user_answers", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar({ length: 255 }).notNull(),

    questionId: integer().notNull(),
    optionId: integer().notNull(),

    wasCorrect: boolean().notNull(),

    createdAt: timestamp().defaultNow().notNull(),
},(t)=>({
    optionBelongsToQuestionFk: foreignKey({
        columns: [t.questionId, t.optionId],
        foreignColumns: [
            questionOptionTable.questionId,
            questionOptionTable.id,
        ],
    }).onDelete("restrict")
}));

export const ratingEventTable = pgTable("rating_events", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar({ length: 255 }).notNull(),

    // cause of rating
    answerId: integer().references(()=>userAnswerTable.id),
    // which concept rated in this event
    conceptId: integer().references(()=>conceptTable.id),

    //users concept rating
    oldRatingUser: doublePrecision(),
    newRatingUser: doublePrecision(),

    oldRatingQuestion: doublePrecision(),
    newRatingQuestion: doublePrecision()
})

export const userConceptRatingTable=pgTable("user_concept_rating", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar({ length: 255 }).notNull(),
    conceptId: integer().references(()=>conceptTable.id),
    rating: doublePrecision().default(1000).notNull(),

    updatedAt: timestamp().defaultNow().notNull(),
},(t)=>({
    userConceptUnique: unique().on(t.userId, t.conceptId),
}))


export const questionConceptRatingTable=pgTable("question_concept_rating", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    questionId: integer().references(()=>questionTable.id),
    conceptId: integer().references(()=>conceptTable.id),
    rating: doublePrecision().default(1000).notNull(),

    updatedAt: timestamp().defaultNow().notNull(),
},(t)=>({
    questionConceptUnique: unique().on(t.questionId, t.conceptId),
}))

// New Curriculum

export const curriculum = pgTable("curriculums", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer().references(()=>subjectTable.id),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
})

export const curriculumTopic = pgTable("curriculumTopics", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    curriculumId: integer().references(()=>curriculum.id,{onDelete:"cascade"}).notNull(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull().unique(),
    description: varchar({ length: 255 }).notNull(),
    position: integer()
},(t)=>({
    topicCurriculumUnique: unique().on(t.id, t.curriculumId),
}))

export const curriculumConcept = pgTable("curriculum_concepts", {
    // id of concept's curriculum
    curriculumId: integer().references(()=>curriculum.id,{onDelete:"cascade"}).notNull(),
    // concepts global Id
    conceptId: integer().references(()=>conceptTable.id,{onDelete:"cascade"}).notNull(),
    localName: varchar("local_name", { length: 255 }),
    localDescription: varchar("local_description", { length: 255 }),
},(t)=>({
    pk: primaryKey({columns:[t.curriculumId,t.conceptId]}),
    conceptIdx: index("curriculum_concepts_concept_id_idx").on(t.conceptId),
}))

export const curriculumTopicConcepts = pgTable("curriculumTopics_concepts", {
    curriculumId: integer().notNull(),
    curriculumTopicId: integer().notNull(),
    conceptId: integer().notNull(),
},(t)=>({
    pk: primaryKey({columns:[t.curriculumTopicId,t.conceptId]}),
    curriculumTopicFk: foreignKey({
        columns: [t.curriculumTopicId, t.curriculumId],
        foreignColumns: [curriculumTopic.id, curriculumTopic.curriculumId],
    }).onDelete("cascade"),
    curriculumConceptFk: foreignKey({
        columns: [t.curriculumId, t.conceptId],
        foreignColumns: [curriculumConcept.curriculumId, curriculumConcept.conceptId],
    }).onDelete("cascade"),
}))

export const articleCurriculumTopicsTable = pgTable("article_curriculum_topics", {
    articleId: integer("article_id").references(() => articleTable.id, {onDelete: "cascade"}).notNull(),
    curriculumTopicId: integer("curriculum_topic_id").references(() => curriculumTopic.id, {onDelete: "cascade"}).notNull(),
}, (t) => ({
    pk: primaryKey({columns: [t.articleId, t.curriculumTopicId]}),
}))

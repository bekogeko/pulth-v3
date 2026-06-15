"use server";

import {and, asc, count, eq, sql} from "drizzle-orm";

import {
    conceptTable,
    curriculum,
    curriculumConcept,
    curriculumTopic,
    curriculumTopicConcepts,
    questionConceptsTable,
    subjectTable,
} from "@/db/schema";
import {database} from "@/lib/database";

export async function getSubjects() {
    return database
        .select({
            id: subjectTable.id,
            name: subjectTable.name,
            slug: subjectTable.slug,
        })
        .from(subjectTable)
        .orderBy(asc(subjectTable.name));
}

export async function getSubjectSlugs() {
    return database
        .select({slug: subjectTable.slug})
        .from(subjectTable);
}

export async function getSubjectWithCurriculums(slug: string) {
    const [subject] = await database
        .select({
            id: subjectTable.id,
            name: subjectTable.name,
            slug: subjectTable.slug,
        })
        .from(subjectTable)
        .where(eq(subjectTable.slug, slug))
        .limit(1);

    if (!subject) {
        return null;
    }

    const curriculums = await database
        .select({
            id: curriculum.id,
            name: curriculum.name,
            slug: curriculum.slug,
        })
        .from(curriculum)
        .where(eq(curriculum.subjectId, subject.id))
        .orderBy(asc(curriculum.id));

    return {...subject, curriculums};
}

export async function getCurriculumSlugs() {
    return database
        .select({
            subjectSlug: subjectTable.slug,
            curriculumSlug: curriculum.slug,
        })
        .from(curriculum)
        .innerJoin(subjectTable, eq(curriculum.subjectId, subjectTable.id));
}

export async function getCurriculumTopicSlugs() {
    return database
        .select({
            subjectSlug: subjectTable.slug,
            curriculumSlug: curriculum.slug,
            topicSlug: curriculumTopic.slug,
        })
        .from(curriculumTopic)
        .innerJoin(curriculum, eq(curriculumTopic.curriculumId, curriculum.id))
        .innerJoin(subjectTable, eq(curriculum.subjectId, subjectTable.id));
}

export async function getCurriculumDetail(subjectSlug: string, curriculumSlug: string) {
    const [detail] = await database
        .select({
            id: curriculum.id,
            name: curriculum.name,
            slug: curriculum.slug,
            subjectName: subjectTable.name,
            subjectSlug: subjectTable.slug,
        })
        .from(curriculum)
        .innerJoin(subjectTable, eq(curriculum.subjectId, subjectTable.id))
        .where(and(
            eq(subjectTable.slug, subjectSlug),
            eq(curriculum.slug, curriculumSlug),
        ))
        .limit(1);

    if (!detail) {
        return null;
    }

    const topics = await database
        .select({
            id: curriculumTopic.id,
            name: curriculumTopic.name,
            slug: curriculumTopic.slug,
            description: curriculumTopic.description,
        })
        .from(curriculumTopic)
        .where(eq(curriculumTopic.curriculumId, detail.id))
        .orderBy(asc(curriculumTopic.position), asc(curriculumTopic.id));

    return {...detail, topics};
}

export async function getCurriculumTopicDetail(subjectSlug: string, curriculumSlug: string, topicSlug: string) {
    const [detail] = await database
        .select({
            id: curriculum.id,
            name: curriculum.name,
            slug: curriculum.slug,
            subjectName: subjectTable.name,
            subjectSlug: subjectTable.slug,
            topicId: curriculumTopic.id,
            topicName: curriculumTopic.name,
            topicSlug: curriculumTopic.slug,
            topicDescription: curriculumTopic.description,
            topicPosition: curriculumTopic.position,
        })
        .from(curriculumTopic)
        .innerJoin(curriculum, eq(curriculumTopic.curriculumId, curriculum.id))
        .innerJoin(subjectTable, eq(curriculum.subjectId, subjectTable.id))
        .where(and(
            eq(subjectTable.slug, subjectSlug),
            eq(curriculum.slug, curriculumSlug),
            eq(curriculumTopic.slug, topicSlug),
        ))
        .limit(1);

    if (!detail) {
        return null;
    }

    const conceptQuestionCountsSq = database
        .select({
            conceptId: questionConceptsTable.conceptId,
            questionCount: count(questionConceptsTable.questionId).as("question_count"),
        })
        .from(questionConceptsTable)
        .groupBy(questionConceptsTable.conceptId)
        .as("concept_question_counts_sq");

    const concepts = await database
        .select({
            id: conceptTable.id,
            name: conceptTable.name,
            slug: conceptTable.slug,
            description: conceptTable.description,
            localName: curriculumConcept.localName,
            localDescription: curriculumConcept.localDescription,
            questionCount: sql<number>`coalesce(${conceptQuestionCountsSq.questionCount}, 0)`,
        })
        .from(curriculumTopicConcepts)
        .innerJoin(curriculumConcept, and(
            eq(curriculumTopicConcepts.curriculumId, curriculumConcept.curriculumId),
            eq(curriculumTopicConcepts.conceptId, curriculumConcept.conceptId),
        ))
        .innerJoin(conceptTable, eq(curriculumTopicConcepts.conceptId, conceptTable.id))
        .leftJoin(conceptQuestionCountsSq, eq(conceptTable.id, conceptQuestionCountsSq.conceptId))
        .where(and(
            eq(curriculumTopicConcepts.curriculumId, detail.id),
            eq(curriculumTopicConcepts.curriculumTopicId, detail.topicId),
        ))
        .orderBy(sql`coalesce(${curriculumConcept.localName}, ${conceptTable.name})`, asc(conceptTable.name));

    return {
        ...detail,
        concepts: concepts.map((concept) => ({
            ...concept,
            questionCount: Number(concept.questionCount),
        })),
    };
}

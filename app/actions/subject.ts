"use server";

import {and, asc, eq} from "drizzle-orm";

import {curriculum, curriculumTopic, subjectTable} from "@/db/schema";
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

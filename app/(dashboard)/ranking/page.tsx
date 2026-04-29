import Link from "next/link";
import {auth} from "@clerk/nextjs/server";
import {and, asc, countDistinct, desc, eq, sql} from "drizzle-orm";
import {ArrowUpRight, BarChart3, ClipboardList, Flame, PlayCircle, Target, Trophy, Users} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    conceptTable,
    questionConceptRatingTable,
    questionConceptsTable,
    topicConceptsTable,
    topicTable,
    userConceptRatingTable,
} from "@/db/schema";
import {database} from "@/lib/database";

async function getDifficultTopicConcepts(userId?: string) {
    const communityStatsSq = database
        .select({
            conceptId: conceptTable.id,
            ratedUsers: countDistinct(userConceptRatingTable.userId).as("rated_users"),
        })
        .from(conceptTable)
        .innerJoin(userConceptRatingTable, eq(userConceptRatingTable.conceptId, conceptTable.id))
        .groupBy(conceptTable.id)
        .as("community_stats_sq");

    const difficultyStatsSq = database
        .select({
            conceptId: questionConceptsTable.conceptId,
            questionCount: countDistinct(questionConceptsTable.questionId).as("question_count"),
            ratedQuestions: countDistinct(questionConceptRatingTable.questionId).as("rated_questions"),
            difficultyRating: sql<number>`
                coalesce(avg(${questionConceptRatingTable.rating}), 1000)
            `.as("difficulty_rating"),
        })
        .from(questionConceptsTable)
        .leftJoin(
            questionConceptRatingTable,
            and(
                eq(questionConceptRatingTable.questionId, questionConceptsTable.questionId),
                eq(questionConceptRatingTable.conceptId, questionConceptsTable.conceptId),
            )
        )
        .groupBy(questionConceptsTable.conceptId)
        .as("difficulty_stats_sq");

    const rows = await database
        .select({
            topicId: topicTable.id,
            topicTitle: topicTable.title,
            topicDescription: topicTable.description,
            conceptId: conceptTable.id,
            conceptSlug: conceptTable.slug,
            conceptName: conceptTable.name,
            conceptDescription: conceptTable.description,
            difficultyRating: difficultyStatsSq.difficultyRating,
            ratedQuestions: difficultyStatsSq.ratedQuestions,
            questionCount: difficultyStatsSq.questionCount,
            ratedUsers: communityStatsSq.ratedUsers,
        })
        .from(topicTable)
        .leftJoin(topicConceptsTable, eq(topicTable.id, topicConceptsTable.topicId))
        .leftJoin(conceptTable, eq(topicConceptsTable.conceptId, conceptTable.id))
        .leftJoin(difficultyStatsSq, eq(conceptTable.id, difficultyStatsSq.conceptId))
        .leftJoin(communityStatsSq, eq(conceptTable.id, communityStatsSq.conceptId))
        .orderBy(
            desc(sql`coalesce(${difficultyStatsSq.difficultyRating}, 0)`),
            desc(sql`coalesce(${difficultyStatsSq.questionCount}, 0)`),
            asc(conceptTable.name),
        );

    const userRanksSq = database
        .select({
            conceptId: userConceptRatingTable.conceptId,
            userId: userConceptRatingTable.userId,
            rating: userConceptRatingTable.rating,
            rank: sql<number>`
                rank() over (
                    partition by ${userConceptRatingTable.conceptId}
                    order by ${userConceptRatingTable.rating} desc
                )
            `.as("rank"),
        })
        .from(userConceptRatingTable)
        .as("user_ranks_sq");

    const userRanks = userId
        ? await database
            .select({
                conceptId: userRanksSq.conceptId,
                rating: userRanksSq.rating,
                rank: userRanksSq.rank,
            })
            .from(userRanksSq)
            .where(eq(userRanksSq.userId, userId))
        : [];
    const userRankByConceptId = new Map(
        userRanks
            .filter((ranking) => ranking.conceptId !== null)
            .map((ranking) => [ranking.conceptId, ranking])
    );

    return rows.reduce<TopicRanking[]>((topics, row) => {
        let topic = topics.find((item) => item.id === row.topicId);

        if (!topic) {
            topic = {
                id: row.topicId,
                title: row.topicTitle,
                description: row.topicDescription,
                concepts: [],
            };
            topics.push(topic);
        }

        if (row.conceptId) {
            topic.concepts.push({
                id: row.conceptId,
                slug: row.conceptSlug,
                name: row.conceptName,
                description: row.conceptDescription,
                difficultyRating: row.difficultyRating,
                ratedQuestions: Number(row.ratedQuestions ?? 0),
                questionCount: Number(row.questionCount ?? 0),
                ratedUsers: Number(row.ratedUsers ?? 0),
                userRating: userRankByConceptId.get(row.conceptId)?.rating ?? null,
                userRank: userRankByConceptId.get(row.conceptId)?.rank ?? null,
            });
        }

        return topics;
    }, []).map((topic) => ({
        ...topic,
        concepts: topic.concepts.sort((left, right) => (
            getRatingValue(right.difficultyRating) - getRatingValue(left.difficultyRating)
            || right.questionCount - left.questionCount
            || String(left.name).localeCompare(String(right.name))
        )),
    })).sort((left, right) => (
        getTopicDifficulty(right) - getTopicDifficulty(left)
        || right.concepts.length - left.concepts.length
        || left.title.localeCompare(right.title)
    ));
}

function formatRating(rating: number | string | null) {
    return Math.round(Number(rating ?? 0)).toLocaleString();
}

type TopicRanking = {
    id: number;
    title: string;
    description: string;
    concepts: ConceptRanking[];
};

type ConceptRanking = {
    id: number;
    slug: string | null;
    name: string | null;
    description: string | null;
    difficultyRating: number | string | null;
    ratedQuestions: number;
    ratedUsers: number;
    questionCount: number;
    userRating: number | null;
    userRank: number | null;
};

function getRatingValue(rating: number | string | null) {
    return Number(rating ?? 0);
}

function getDifficultyPercent(rating: number | string | null, maxRating: number) {
    const value = getRatingValue(rating);

    return maxRating ? Math.max((value / maxRating) * 100, 10) : 10;
}

function getTopicDifficulty(topic: TopicRanking) {
    const conceptsWithQuestions = topic.concepts.filter((concept) => concept.questionCount > 0);

    if (!conceptsWithQuestions.length) {
        return 0;
    }

    return conceptsWithQuestions.reduce(
        (total, concept) => total + getRatingValue(concept.difficultyRating),
        0
    ) / conceptsWithQuestions.length;
}

export default async function RankingPage() {
    const {isAuthenticated, userId} = await auth();
    const topicRankings = await getDifficultTopicConcepts(userId ?? undefined);
    const concepts = topicRankings.flatMap((topic) => topic.concepts);
    const practiceConcepts = concepts.filter((concept) => concept.questionCount > 0);
    const topConcept = practiceConcepts[0];
    const topTopic = topicRankings.find((topic) => topic.concepts.some((concept) => concept.questionCount > 0));
    const averageDifficulty = practiceConcepts.length
        ? practiceConcepts.reduce((total, ranking) => total + Number(ranking.difficultyRating), 0) / practiceConcepts.length
        : 0;
    const ratedUsers = practiceConcepts.reduce((total, ranking) => total + ranking.ratedUsers, 0);
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl space-y-1">
                    <h2 className="text-lg font-semibold">Difficult Topics</h2>
                    <p className="text-sm text-muted-foreground">
                        See the hardest topics and concepts by question difficulty, then jump into focused practice.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/quiz">
                            <ClipboardList className="size-4" />
                            Practice
                        </Link>
                    </Button>
                    {isAuthenticated ? (
                        <Button asChild size="lg">
                            <Link href="/ranking/self">
                                <Trophy className="size-4" />
                                My Ranks
                            </Link>
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <BarChart3 className="size-3.5" />
                            Topics
                        </CardDescription>
                        <CardTitle>{topicRankings.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Flame className="size-3.5" />
                            Practice concepts
                        </CardDescription>
                        <CardTitle>{practiceConcepts.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            Learner ratings
                        </CardDescription>
                        <CardTitle>{ratedUsers}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Target className="size-3.5" />
                            Average difficulty
                        </CardDescription>
                        <CardTitle>{formatRating(averageDifficulty)}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {topConcept ? (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-medium">Most difficult concept</p>
                            <p className="truncate text-sm text-muted-foreground">
                                {topConcept.name} is currently rated {formatRating(topConcept.difficultyRating)} for difficulty.
                            </p>
                        </div>
                        {topConcept.slug && topConcept.questionCount > 0 ? (
                            <Button asChild variant="outline" size="sm" className="w-full bg-background sm:w-auto">
                                <Link href={`/quiz/concepts/${topConcept.slug}/solve`} prefetch={false}>
                                    <ArrowUpRight className="size-3" />
                                    Practice
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {topTopic ? (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                                <CardTitle>Topics by Difficulty</CardTitle>
                                <CardDescription>
                                    Higher difficulty means attached questions are being missed more often.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {topicRankings.slice(0, 6).map((topic, index) => {
                            const difficultConcept = topic.concepts.find((concept) => concept.questionCount > 0);

                            return (
                                <div key={topic.id} className="rounded-lg border border-border/70 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-muted-foreground">#{index + 1}</p>
                                            <p className="truncate font-medium">{topic.title}</p>
                                        </div>
                                        <span className="shrink-0 text-sm font-medium">
                                            {formatRating(getTopicDifficulty(topic))}
                                        </span>
                                    </div>
                                    {difficultConcept ? (
                                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                                            <span className="min-w-0 truncate text-muted-foreground">
                                                Hardest: {difficultConcept.name}
                                            </span>
                                            {difficultConcept.slug ? (
                                                <Link
                                                    href={`/quiz/concepts/${difficultConcept.slug}/solve`}
                                                    prefetch={false}
                                                    className="shrink-0 font-medium text-primary hover:underline"
                                                >
                                                    Practice
                                                </Link>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            ) : null}

            {topicRankings.length ? (
                <div className="space-y-4">
                    {topicRankings.map((topic) => {
                        const mostDifficultConceptId = topic.concepts.find((concept) => concept.questionCount > 0)?.id;
                        const practiceCount = topic.concepts.filter((concept) => concept.questionCount > 0).length;
                        const maxDifficulty = Math.max(...topic.concepts.map((concept) => getRatingValue(concept.difficultyRating)), 0);

                        return (
                            <Card key={topic.id}>
                                <CardHeader className="gap-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="flex min-w-0 gap-2">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                <BarChart3 className="size-4" />
                                            </div>
                                            <div className="min-w-0 space-y-1">
                                                <CardTitle className="truncate">{topic.title}</CardTitle>
                                                <CardDescription className="line-clamp-2">
                                                    {topic.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground">
                                            <span className="rounded-full border border-border px-2 py-1">
                                                {practiceCount}/{topic.concepts.length} with practice
                                            </span>
                                            {mostDifficultConceptId ? (
                                                <span className="rounded-full border border-border px-2 py-1">
                                                    Hardest: {topic.concepts.find((concept) => concept.id === mostDifficultConceptId)?.name}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {topic.concepts.length ? (
                                        <div className="overflow-hidden rounded-lg border border-border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/40">
                                                        <TableHead className="w-14">#</TableHead>
                                                        <TableHead>Concept</TableHead>
                                                        <TableHead className="min-w-40">Difficulty</TableHead>
                                                        {isAuthenticated ? <TableHead className="text-right">My rank</TableHead> : null}
                                                        <TableHead className="text-right">Questions</TableHead>
                                                        <TableHead className="text-right">Learners</TableHead>
                                                        <TableHead className="text-right">Practice</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {topic.concepts.map((concept, index) => {
                                                        const isMostDifficult = concept.id === mostDifficultConceptId;
                                                        const difficultyPercent = getDifficultyPercent(concept.difficultyRating, maxDifficulty);

                                                        return (
                                                            <TableRow key={concept.id}>
                                                                <TableCell className="font-medium text-muted-foreground">
                                                                    {index + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="min-w-0 space-y-1">
                                                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                            <p className="min-w-0 font-medium text-foreground">
                                                                                {concept.name}
                                                                            </p>
                                                                            {isMostDifficult ? (
                                                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-medium text-primary">
                                                                                    Hardest
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                        {concept.description ? (
                                                                            <p className="max-w-xl truncate text-xs text-muted-foreground">
                                                                                {concept.description}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex min-w-36 items-center gap-3">
                                                                        <div className="h-2 min-w-20 flex-1 rounded-full bg-muted">
                                                                            <div
                                                                                className="h-2 rounded-full bg-primary"
                                                                                style={{width: `${difficultyPercent}%`}}
                                                                            />
                                                                        </div>
                                                                        <span className="w-11 text-right text-sm font-medium">
                                                                            {formatRating(concept.difficultyRating)}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                {isAuthenticated ? (
                                                                    <TableCell className="text-right">
                                                                        {concept.userRank === null ? (
                                                                            <span className="text-muted-foreground">New</span>
                                                                        ) : (
                                                                            <div className="font-medium">
                                                                                #{concept.userRank}
                                                                                <div className="text-xs font-normal text-muted-foreground">
                                                                                    {formatRating(concept.userRating)}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                ) : null}
                                                                <TableCell className="text-right font-medium">
                                                                    {concept.questionCount}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {concept.ratedUsers}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {concept.questionCount > 0 && concept.slug ? (
                                                                        <Button asChild size="sm" variant="outline">
                                                                            <Link href={`/quiz/concepts/${concept.slug}/solve`} prefetch={false}>
                                                                                <PlayCircle className="size-3" />
                                                                                Practice
                                                                            </Link>
                                                                        </Button>
                                                                    ) : (
                                                                        <Button size="sm" variant="outline" disabled>
                                                                            <PlayCircle className="size-3" />
                                                                            No questions
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-border p-6 text-center">
                                            <p className="text-sm font-medium">No concepts in this topic</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Concepts will appear here when this topic has practice material.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                            <p className="text-sm font-medium">No rankings yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Rankings appear after topics and practice concepts are added.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

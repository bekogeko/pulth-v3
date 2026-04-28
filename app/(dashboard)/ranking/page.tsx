import Link from "next/link";
import {auth} from "@clerk/nextjs/server";
import {asc, count, countDistinct, desc, eq, sql} from "drizzle-orm";
import {ArrowUpRight, BarChart3, ClipboardList, PlayCircle, Target, Trophy, Users} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {
    conceptTable,
    questionConceptsTable,
    topicConceptsTable,
    topicTable,
    userConceptRatingTable,
} from "@/db/schema";
import {database} from "@/lib/database";
import {cn} from "@/lib/utils";

async function getTopicConceptRankings(userId?: string) {
    const ratingStatsSq = database
        .select({
            conceptId: conceptTable.id,
            averageRating: sql<number>`avg(${userConceptRatingTable.rating})`.as("average_rating"),
            ratedUsers: countDistinct(userConceptRatingTable.userId).as("rated_users"),
        })
        .from(conceptTable)
        .innerJoin(userConceptRatingTable, eq(userConceptRatingTable.conceptId, conceptTable.id))
        .groupBy(conceptTable.id)
        .as("rating_stats_sq");

    const questionStatsSq = database
        .select({
            conceptId: questionConceptsTable.conceptId,
            questionCount: count(questionConceptsTable.questionId).as("question_count"),
        })
        .from(questionConceptsTable)
        .groupBy(questionConceptsTable.conceptId)
        .as("question_stats_sq");

    const rows = await database
        .select({
            topicId: topicTable.id,
            topicTitle: topicTable.title,
            topicDescription: topicTable.description,
            conceptId: conceptTable.id,
            conceptSlug: conceptTable.slug,
            conceptName: conceptTable.name,
            conceptDescription: conceptTable.description,
            averageRating: ratingStatsSq.averageRating,
            ratedUsers: ratingStatsSq.ratedUsers,
            questionCount: questionStatsSq.questionCount,
        })
        .from(topicTable)
        .leftJoin(topicConceptsTable, eq(topicTable.id, topicConceptsTable.topicId))
        .leftJoin(conceptTable, eq(topicConceptsTable.conceptId, conceptTable.id))
        .leftJoin(ratingStatsSq, eq(conceptTable.id, ratingStatsSq.conceptId))
        .leftJoin(questionStatsSq, eq(conceptTable.id, questionStatsSq.conceptId))
        .orderBy(
            asc(topicTable.title),
            desc(sql`coalesce(${ratingStatsSq.averageRating}, 0)`),
            asc(conceptTable.name),
        );

    const userRatings = userId
        ? await database
            .select({
                conceptId: userConceptRatingTable.conceptId,
                rating: userConceptRatingTable.rating,
            })
            .from(userConceptRatingTable)
            .where(eq(userConceptRatingTable.userId, userId))
        : [];
    const userRatingByConceptId = new Map(
        userRatings
            .filter((rating) => rating.conceptId !== null)
            .map((rating) => [rating.conceptId, rating.rating])
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
                averageRating: row.averageRating,
                ratedUsers: Number(row.ratedUsers ?? 0),
                questionCount: Number(row.questionCount ?? 0),
                userRating: userRatingByConceptId.get(row.conceptId) ?? null,
            });
        }

        return topics;
    }, []);
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
    averageRating: number | string | null;
    ratedUsers: number;
    questionCount: number;
    userRating: number | null;
};

function getRatingValue(rating: number | string | null) {
    return Number(rating ?? 0);
}

function TopicRankingChart({concepts}: {concepts: ConceptRanking[]}) {
    const ratedConcepts = concepts.filter((concept) => concept.averageRating !== null);
    const maxRating = Math.max(...ratedConcepts.map((concept) => getRatingValue(concept.averageRating)), 0);

    if (!ratedConcepts.length) {
        return (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm font-medium">No rated concepts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    This topic will chart concepts after users solve attached questions.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {ratedConcepts.map((concept, index) => {
                const value = getRatingValue(concept.averageRating);
                const width = maxRating ? `${Math.max((value / maxRating) * 100, 8)}%` : "8%";

                return (
                    <div
                        key={concept.id}
                        className="grid gap-2 sm:grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)_4rem] sm:items-center"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                {index + 1}
                            </span>
                            <span className="truncate text-sm font-medium">{concept.name}</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted">
                            <div
                                className="h-3 rounded-full bg-primary"
                                style={{width}}
                            />
                        </div>
                        <div className="text-right text-sm font-medium">
                            {formatRating(concept.averageRating)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ConceptRankingRow({
    concept,
    index,
    leadingConceptId,
    showUserRating,
}: {
    concept: ConceptRanking;
    index: number;
    leadingConceptId: number | undefined;
    showUserRating: boolean;
}) {
    const hasQuestions = concept.questionCount > 0;
    const isLeading = concept.id === leadingConceptId;
    const rowColumns = showUserRating
        ? "md:grid-cols-[minmax(0,1fr)_7rem_6rem_7rem_auto]"
        : "md:grid-cols-[minmax(0,1fr)_7rem_7rem_auto]";

    return (
        <div className={cn("grid gap-3 rounded-lg border border-border/70 bg-background px-4 py-3 md:items-center", rowColumns)}>
            <div className="min-w-0 space-y-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {index + 1}
                    </span>
                    <p className="min-w-0 truncate font-medium leading-6 text-foreground">
                        {concept.name}
                    </p>
                    {isLeading ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-medium text-primary">
                            Leading
                        </span>
                    ) : null}
                </div>
                {concept.description ? (
                    <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                        {concept.description}
                    </p>
                ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 text-sm md:block md:text-right">
                <span className="text-muted-foreground md:hidden">Community</span>
                <span className="font-medium">
                    {concept.averageRating === null ? "Unrated" : formatRating(concept.averageRating)}
                </span>
            </div>

            {showUserRating ? (
                <div className="flex items-center justify-between gap-3 text-sm md:block md:text-right">
                    <span className="text-muted-foreground md:hidden">You</span>
                    <span className={concept.userRating === null ? "text-muted-foreground" : "font-medium"}>
                        {concept.userRating === null ? "New" : formatRating(concept.userRating)}
                    </span>
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 text-sm md:block md:text-right">
                <span className="text-muted-foreground md:hidden">Learners</span>
                <span className="font-medium">{concept.ratedUsers}</span>
            </div>

            {hasQuestions && concept.slug ? (
                <Button asChild size="sm" className="w-full md:w-auto">
                    <Link href={`/quiz/concepts/${concept.slug}/solve`} prefetch={false}>
                        <PlayCircle className="size-3" />
                        Practice
                    </Link>
                </Button>
            ) : (
                <Button size="sm" className="w-full md:w-auto" disabled>
                    <PlayCircle className="size-3" />
                    No questions
                </Button>
            )}
        </div>
    );
}

export default async function RankingPage() {
    const {isAuthenticated, userId} = await auth();
    const topicRankings = await getTopicConceptRankings(userId ?? undefined);
    const concepts = topicRankings.flatMap((topic) => topic.concepts);
    const ratedConcepts = concepts.filter((concept) => concept.averageRating !== null);
    const topConcept = ratedConcepts[0];
    const averageRating = ratedConcepts.length
        ? ratedConcepts.reduce((total, ranking) => total + Number(ranking.averageRating), 0) / ratedConcepts.length
        : 0;
    const ratedUsers = ratedConcepts.reduce((total, ranking) => total + ranking.ratedUsers, 0);
    const rankingGridColumns = isAuthenticated
        ? "md:grid-cols-[minmax(0,1fr)_7rem_6rem_7rem_auto]"
        : "md:grid-cols-[minmax(0,1fr)_7rem_7rem_auto]";

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl space-y-1">
                    <h2 className="text-lg font-semibold">Concept Rankings</h2>
                    <p className="text-sm text-muted-foreground">
                        See the strongest concepts in each topic, compare your rating, and jump into practice.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/quiz">
                            <ClipboardList className="size-4" />
                            Practice
                        </Link>
                    </Button>
                    <Button asChild size="lg">
                        <Link href="/ranking/self">
                            <Trophy className="size-4" />
                            My Ranks
                        </Link>
                    </Button>
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
                            <Target className="size-3.5" />
                            Ranked concepts
                        </CardDescription>
                        <CardTitle>{ratedConcepts.length}</CardTitle>
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
                            <Trophy className="size-3.5" />
                            Community average
                        </CardDescription>
                        <CardTitle>{formatRating(averageRating)}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {topConcept ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-medium">Top community concept</p>
                            <p className="truncate text-sm text-muted-foreground">
                                {topConcept.name} leads with an average rating of {formatRating(topConcept.averageRating)}.
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

            {topicRankings.length ? (
                <div className="space-y-4">
                    {topicRankings.map((topic) => {
                        const leadingConceptId = topic.concepts.find((concept) => concept.averageRating !== null)?.id;
                        const ratedCount = topic.concepts.filter((concept) => concept.averageRating !== null).length;

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
                                                {ratedCount}/{topic.concepts.length} ranked
                                            </span>
                                            {leadingConceptId ? (
                                                <span className="rounded-full border border-border px-2 py-1">
                                                    Top: {topic.concepts.find((concept) => concept.id === leadingConceptId)?.name}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <TopicRankingChart concepts={topic.concepts} />

                                    {topic.concepts.length ? (
                                        <div className="space-y-2">
                                            <div className={cn("hidden px-4 text-xs font-medium text-muted-foreground md:grid", rankingGridColumns)}>
                                                <span>Concept</span>
                                                <span className="text-right">Community</span>
                                                {isAuthenticated ? <span className="text-right">You</span> : null}
                                                <span className="text-right">Learners</span>
                                                <span className="text-right">Action</span>
                                            </div>
                                            {topic.concepts.map((concept, index) => (
                                                <ConceptRankingRow
                                                    key={concept.id}
                                                    concept={concept}
                                                    index={index}
                                                    leadingConceptId={leadingConceptId}
                                                    showUserRating={isAuthenticated}
                                                />
                                            ))}
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

import {auth} from "@clerk/nextjs/server";
import {and, asc, countDistinct, desc, eq} from "drizzle-orm";

import {conceptTable, ratingEventTable, userConceptRatingTable} from "@/db/schema";
import {database} from "@/lib/database";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

async function getMyConceptRankings(userId: string) {
    return database
        .select({
            conceptId: conceptTable.id,
            conceptName: conceptTable.name,
            conceptDescription: conceptTable.description,
            rating: userConceptRatingTable.rating,
            updatedAt: userConceptRatingTable.updatedAt,
            eventCount: countDistinct(ratingEventTable.id),
            answerCount: countDistinct(ratingEventTable.answerId),
        })
        .from(userConceptRatingTable)
        .innerJoin(conceptTable, eq(userConceptRatingTable.conceptId, conceptTable.id))
        .leftJoin(
            ratingEventTable,
            and(
                eq(ratingEventTable.userId, userId),
                eq(ratingEventTable.conceptId, userConceptRatingTable.conceptId),
            )
        )
        .where(eq(userConceptRatingTable.userId, userId))
        .groupBy(
            conceptTable.id,
            conceptTable.name,
            conceptTable.description,
            userConceptRatingTable.rating,
            userConceptRatingTable.updatedAt,
        )
        .orderBy(desc(userConceptRatingTable.rating), asc(conceptTable.name));
}

function formatRating(rating: number) {
    return Math.round(rating).toLocaleString();
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

export default async function SelfRankingPage() {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return (
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Rankings</CardTitle>
                        <CardDescription>
                            Sign in to see your concept ratings.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const rankings = await getMyConceptRankings(userId);
    const topRating = rankings[0]?.rating ?? 0;
    const averageRating = rankings.length
        ? rankings.reduce((total, ranking) => total + ranking.rating, 0) / rankings.length
        : 0;
    const totalAnswers = rankings.reduce((total, ranking) => total + Number(ranking.answerCount), 0);

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold">My Rankings</h2>
                <p className="text-sm text-muted-foreground">
                    Track your Elo rating by concept based on solved quiz questions.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Rated concepts</CardDescription>
                        <CardTitle>{rankings.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Average rating</CardDescription>
                        <CardTitle>{formatRating(averageRating)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Answers rated</CardDescription>
                        <CardTitle>{totalAnswers}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Concept Ratings</CardTitle>
                    <CardDescription>
                        Higher ratings indicate stronger performance in a concept.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {rankings.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Rank</TableHead>
                                    <TableHead>Concept</TableHead>
                                    <TableHead className="text-right">Rating</TableHead>
                                    <TableHead className="text-right">Answers</TableHead>
                                    <TableHead className="text-right">Events</TableHead>
                                    <TableHead className="text-right">Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rankings.map((ranking, index) => (
                                    <TableRow key={ranking.conceptId}>
                                        <TableCell className="font-medium">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="min-w-0 space-y-1">
                                                <p className="font-medium text-foreground">
                                                    {ranking.conceptName}
                                                </p>
                                                {ranking.conceptDescription ? (
                                                    <p className="max-w-xl truncate text-xs text-muted-foreground">
                                                        {ranking.conceptDescription}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatRating(ranking.rating)}
                                            {ranking.rating === topRating ? (
                                                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] text-primary">
                                                    Top
                                                </span>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(ranking.answerCount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(ranking.eventCount)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {formatDate(ranking.updatedAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                            <p className="text-sm font-medium">No concept ratings yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Solve quiz questions attached to concepts to start building rankings.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

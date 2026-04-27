import Link from "next/link";
import {asc, countDistinct, desc, sql} from "drizzle-orm";
import {BarChart3, ClipboardList, Trophy} from "lucide-react";

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
import {conceptTable, ratingEventTable, userConceptRatingTable} from "@/db/schema";
import {database} from "@/lib/database";

async function getConceptRankings() {
    return database
        .select({
            conceptId: conceptTable.id,
            conceptName: conceptTable.name,
            conceptDescription: conceptTable.description,
            averageRating: sql<number>`avg(${userConceptRatingTable.rating})`,
            topRating: sql<number>`max(${userConceptRatingTable.rating})`,
            ratedUsers: countDistinct(userConceptRatingTable.userId),
            ratingEvents: countDistinct(ratingEventTable.id),
        })
        .from(userConceptRatingTable)
        .innerJoin(conceptTable, sql`${userConceptRatingTable.conceptId} = ${conceptTable.id}`)
        .leftJoin(ratingEventTable, sql`${ratingEventTable.conceptId} = ${conceptTable.id}`)
        .groupBy(conceptTable.id, conceptTable.name, conceptTable.description)
        .orderBy(desc(sql`avg(${userConceptRatingTable.rating})`), asc(conceptTable.name));
}

function formatRating(rating: number | string | null) {
    return Math.round(Number(rating ?? 0)).toLocaleString();
}

export default async function RankingPage() {
    const rankings = await getConceptRankings();
    const topConcept = rankings[0];
    const averageRating = rankings.length
        ? rankings.reduce((total, ranking) => total + Number(ranking.averageRating), 0) / rankings.length
        : 0;
    const ratedUsers = rankings.reduce((total, ranking) => total + Number(ranking.ratedUsers), 0);

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl space-y-1">
                    <h2 className="text-lg font-semibold">Ranks</h2>
                    <p className="text-sm text-muted-foreground">
                        Compare concept ratings across solved quiz activity and track which areas are trending strongest.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/quiz">
                            <ClipboardList className="size-4" />
                            Quizzes
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

            <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Ranked concepts</CardDescription>
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
                        <CardDescription>User ratings</CardDescription>
                        <CardTitle>{ratedUsers}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader className="gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <BarChart3 className="size-4" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle>Concept Leaderboard</CardTitle>
                            <CardDescription>
                                Ranked by average user Elo rating for each concept.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {rankings.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Rank</TableHead>
                                    <TableHead>Concept</TableHead>
                                    <TableHead className="text-right">Average</TableHead>
                                    <TableHead className="text-right">Top</TableHead>
                                    <TableHead className="text-right">Users</TableHead>
                                    <TableHead className="text-right">Events</TableHead>
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
                                                    {ranking.conceptId === topConcept?.conceptId ? (
                                                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] text-primary">
                                                            Leading
                                                        </span>
                                                    ) : null}
                                                </p>
                                                {ranking.conceptDescription ? (
                                                    <p className="max-w-xl truncate text-xs text-muted-foreground">
                                                        {ranking.conceptDescription}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatRating(ranking.averageRating)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatRating(ranking.topRating)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(ranking.ratedUsers)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {Number(ranking.ratingEvents)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                            <p className="text-sm font-medium">No rankings yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Rankings appear after users solve quiz questions attached to concepts.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

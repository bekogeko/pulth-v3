import Link from "next/link";
import {Sparkles, Workflow} from "lucide-react";

import type {getAllQuizzes} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";

type QuizListProps = {
    quizzes: Awaited<ReturnType<typeof getAllQuizzes>> | undefined;
    isLoading: boolean;
};

export function QuizList({quizzes, isLoading}: QuizListProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({length: 3}, (_, index) => (
                    <Card key={index} className="overflow-hidden border-border/70">
                        <CardHeader className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-7 w-36" />
                                </div>
                                <Skeleton className="h-16 w-20 rounded-2xl" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </CardHeader>
                        <CardContent className="flex gap-2 pt-0">
                            <Skeleton className="h-9 flex-1" />
                            <Skeleton className="h-9 flex-1" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!quizzes?.length) {
        return (
            <Card className="border-dashed border-border/80 bg-muted/20">
                <CardHeader>
                    <CardTitle>No quizzes yet</CardTitle>
                    <CardDescription>
                        Create your first quiz to start building questions and sharing a solve flow.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((item) => {
                const questionCount = Number(item.questionCount);
                const questionLabel = `${questionCount} question${questionCount === 1 ? "" : "s"}`;

                return (
                    <Card
                        key={item.id}
                        className="group relative overflow-hidden border-border/70 bg-gradient-to-b from-card via-card to-muted/30 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-chart-2/70" />
                        <CardHeader className="gap-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
                                        Quiz
                                    </span>
                                    <div className="space-y-2">
                                        <CardTitle className="text-xl leading-tight text-balance">
                                            {item.title}
                                        </CardTitle>
                                        <CardDescription className="min-h-12 text-sm leading-6 text-muted-foreground">
                                            {item.description}
                                        </CardDescription>
                                    </div>
                                </div>

                                <div className="shrink-0 rounded-2xl border border-border/80 bg-background/90 px-3 py-2 text-right shadow-sm backdrop-blur">
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                        Questions
                                    </p>
                                    <p className="text-2xl font-semibold tracking-tight">{questionCount}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Workflow className="size-3.5" />
                                <span>{questionLabel}</span>
                            </div>
                        </CardHeader>

                        <CardContent className="flex gap-2 pt-0">
                            <Button asChild size="lg" className="flex-1">
                                <Link href={`/quiz/${item.slug}/solve`} prefetch={false}>
                                    <Sparkles />
                                    Solve
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

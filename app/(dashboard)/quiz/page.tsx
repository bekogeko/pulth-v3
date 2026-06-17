import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight, BookOpenText} from "lucide-react";

import {getConceptsForPractice} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Practice Concepts | Pulth",
    description: "Browse concepts and practice questions one concept at a time. Sharpen your knowledge with focused concept practice.",
};

export default async function Quiz() {
    const concepts = await getConceptsForPractice();

    return (
        <div className="flex flex-col gap-6 p-6">
            <header className="border-b border-border pb-5">
                <div className="max-w-2xl space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Quiz practice
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight">Concepts</h1>
                    <p className="text-sm leading-6 text-muted-foreground">
                        Pick a concept to solve its questions one at a time.
                    </p>
                </div>
            </header>

            {concepts.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {concepts.map((concept) => {
                        const questionCount = Number(concept.questionCount);
                        const hasQuestions = questionCount > 0;

                        return (
                            <Card
                                key={concept.id}
                                className="group relative overflow-hidden border-border/70 bg-gradient-to-b from-card via-card to-muted/30 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-chart-2/70" />
                                <CardHeader className="gap-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
                                                Concept
                                            </span>
                                            <div className="space-y-2">
                                                <CardTitle className="text-xl leading-tight text-balance">
                                                    {concept.name}
                                                </CardTitle>
                                                <CardDescription className="min-h-12 text-sm leading-6 text-muted-foreground">
                                                    {concept.description}
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
                                        <BookOpenText className="size-3.5" />
                                        <span>{questionCount} question{questionCount === 1 ? "" : "s"}</span>
                                    </div>
                                </CardHeader>

                                <CardContent className="mt-auto flex gap-2 pt-0">
                                    {hasQuestions ? (
                                        <Button asChild size="lg" className="flex-1">
                                            <Link href={`/quiz/concepts/${concept.slug}/solve`} prefetch={false}>
                                                Practice
                                                <ArrowRight />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button size="lg" className="flex-1" disabled>
                                            No questions yet
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-dashed border-border/80 bg-muted/20">
                    <CardHeader>
                        <CardTitle>No concepts yet</CardTitle>
                        <CardDescription>
                            Add concepts and attach questions to create focused solve paths.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    );
}

import type {Metadata} from "next";
import Link from "next/link";
import {permanentRedirect} from "next/navigation";
import {ArrowRight, BookOpenText} from "lucide-react";

import {getAllTopicsWithConcepts} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Practice Topics | Pulth",
    description: "Browse topics and practice questions one concept at a time. Sharpen your knowledge with focused concept practice.",
};

type QuizPageProps = {
    searchParams: Promise<{
        topic?: string | string[];
    }>;
};

export default async function Quiz({searchParams}: QuizPageProps) {
    const {topic: topicParam} = await searchParams;
    const legacyTopicSlug = Array.isArray(topicParam) ? topicParam[0] : topicParam;
    const topics = await getAllTopicsWithConcepts();

    if (legacyTopicSlug && topics.some((item) => item.slug === legacyTopicSlug)) {
        permanentRedirect(`/quiz/${legacyTopicSlug}`);
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <header className="border-b border-border pb-5">
                <div className="max-w-2xl space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Quiz practice
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
                    <p className="text-sm leading-6 text-muted-foreground">
                        Pick a topic to browse its concepts and solve questions one concept at a time.
                    </p>
                </div>
            </header>

            {topics.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {topics.map((topic) => {
                        const conceptCount = topic.concepts.length;
                        const questionCount = topic.concepts.reduce(
                            (total, concept) => total + Number(concept.questionCount),
                            0
                        );
                        const previewConcepts = topic.concepts.slice(0, 4);
                        const remainingConceptCount = conceptCount - previewConcepts.length;

                        return (
                            <Card
                                key={topic.id}
                                className="group relative overflow-hidden border-border/70 bg-gradient-to-b from-card via-card to-muted/30 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-chart-2/70" />
                                <CardHeader className="gap-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
                                                Topic
                                            </span>
                                            <div className="space-y-2">
                                                <CardTitle className="text-xl leading-tight text-balance">
                                                    {topic.title}
                                                </CardTitle>
                                                <CardDescription className="min-h-12 text-sm leading-6 text-muted-foreground">
                                                    {topic.description}
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
                                        <span>{conceptCount} concept{conceptCount === 1 ? "" : "s"}</span>
                                    </div>

                                    {previewConcepts.length ? (
                                        <ul className="flex flex-wrap gap-1.5">
                                            {previewConcepts.map((concept) => (
                                                <li
                                                    key={concept.id}
                                                    className="max-w-full truncate rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground"
                                                >
                                                    {concept.name}
                                                </li>
                                            ))}
                                            {remainingConceptCount > 0 ? (
                                                <li className="rounded-full border border-dashed border-border/70 px-2.5 py-1 text-xs text-muted-foreground">
                                                    +{remainingConceptCount} more
                                                </li>
                                            ) : null}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            No concepts attached to this topic yet.
                                        </p>
                                    )}
                                </CardHeader>

                                <CardContent className="mt-auto flex gap-2 pt-0">
                                    <Button asChild size="lg" className="flex-1">
                                        <Link href={`/quiz/${topic.slug}`} prefetch={false}>
                                            Explore concepts
                                            <ArrowRight />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-dashed border-border/80 bg-muted/20">
                    <CardHeader>
                        <CardTitle>No topics yet</CardTitle>
                        <CardDescription>
                            Add topics and attach concepts to create focused solve paths.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    );
}

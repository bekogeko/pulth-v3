"use client";

import Link from "next/link";
import {useState} from "react";
import {BookOpenText, ChevronRight, Sparkles} from "lucide-react";

import type {getAllTopicsWithConcepts} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {cn} from "@/lib/utils";

type TopicListProps = {
    topics: Awaited<ReturnType<typeof getAllTopicsWithConcepts>> | undefined;
    isLoading: boolean;
    selectedTopicSlug?: string;
};

export function TopicList({topics, isLoading, selectedTopicSlug}: TopicListProps) {
    const [selectedTopicOverrideSlug, setSelectedTopicOverrideSlug] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
                <Card className="border-border/70">
                    <CardHeader className="space-y-3">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardHeader>
                </Card>
                <Card className="border-border/70">
                    <CardHeader className="space-y-3">
                        <Skeleton className="h-7 w-44" />
                        <Skeleton className="h-4 w-4/5" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!topics?.length) {
        return (
            <Card className="border-dashed border-border/80 bg-muted/20">
                <CardHeader>
                    <CardTitle>No topics yet</CardTitle>
                    <CardDescription>
                        Add topics and attach concepts to create focused solve paths.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const activeTopic = topics.find((topic) => topic.slug === selectedTopicSlug)
        ?? topics.find((topic) => topic.slug === selectedTopicOverrideSlug)
        ?? topics[0];
    const activeTopicId = activeTopic.id;

    return (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <Card className="border-border/70 shadow-sm">
                <CardHeader className="gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        <BookOpenText className="size-4" />
                        Topics
                    </div>
                    <div className="space-y-2">
                        {topics.map((topic) => {
                            const conceptCount = topic.concepts.length;
                            const isSelected = topic.id === activeTopicId;

                            return (
                                <Link
                                    key={topic.id}
                                    href={`/quiz?topic=${encodeURIComponent(topic.slug)}`}
                                    onClick={() => setSelectedTopicOverrideSlug(topic.slug)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                                        "hover:border-primary/40 hover:bg-primary/5",
                                        isSelected
                                            ? "border-primary/50 bg-primary/8 text-foreground"
                                            : "border-transparent bg-transparent text-muted-foreground"
                                    )}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium">{topic.title}</span>
                                        <span className="block text-xs">
                                            {conceptCount} concept{conceptCount === 1 ? "" : "s"}
                                        </span>
                                    </span>
                                    <ChevronRight className={cn("size-4 shrink-0", isSelected && "text-primary")} />
                                </Link>
                            );
                        })}
                    </div>
                </CardHeader>
            </Card>

            <div className="min-w-0">
                {topics.map((topic) => {
                    const isSelected = topic.id === activeTopicId;

                    return (
                        <Card
                            key={topic.id}
                            id={`topic-${topic.slug}`}
                            className={cn("border-border/70 shadow-sm", !isSelected && "hidden")}
                        >
                            <CardHeader className="gap-2">
                                <CardTitle className="text-xl leading-tight">{topic.title}</CardTitle>
                                <CardDescription className="text-sm leading-6">
                                    {topic.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {topic.concepts.length ? (
                                    topic.concepts.map((concept) => {
                                        const questionCount = Number(concept.questionCount);

                                        return (
                                            <div
                                                key={concept.id}
                                                className="grid gap-3 rounded-lg border border-border/70 bg-background px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-center"
                                            >
                                                <div className="min-w-0 space-y-1">
                                                    <p className="truncate font-medium leading-6">{concept.name}</p>
                                                    <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                                                        {concept.description || "No description provided."}
                                                    </p>
                                                </div>
                                                <div className="text-sm text-muted-foreground sm:text-right">
                                                    <span className="font-medium text-foreground">{questionCount}</span>
                                                    {" "}question{questionCount === 1 ? "" : "s"}
                                                </div>
                                                {questionCount > 0 ? (
                                                    <Button asChild size="sm" className="shrink-0">
                                                        <Link href={`/quiz/concepts/${concept.slug}/solve`} prefetch={false}>
                                                            <Sparkles />
                                                            Solve
                                                        </Link>
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" className="shrink-0" disabled>
                                                        <Sparkles />
                                                        Solve
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="rounded-lg border border-dashed border-border/80 px-4 py-3 text-sm text-muted-foreground">
                                        No concepts attached to this topic yet.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

"use client";

import {Loader2, Search} from "lucide-react";

import type {SimilarQuestionResult} from "@/app/(dashboard)/quiz/quiz";
import {Skeleton} from "@/components/ui/skeleton";

type SimilarQuestionsPanelProps = {
    enabled: boolean;
    isFetching: boolean;
    questions: SimilarQuestionResult[];
};

// Shared by the self-service create dialog and the admin question authoring page.
// Surfaces existing questions that look similar so authors can avoid duplicates.
export function SimilarQuestionsPanel({
    enabled,
    isFetching,
    questions,
}: SimilarQuestionsPanelProps) {
    if (!enabled) {
        return (
            <div className="rounded-md border border-dashed border-border/70 bg-background/40 px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Search className="size-4 text-muted-foreground" />
                    Similar questions
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    Type at least 8 characters to check your existing questions before saving.
                </p>
            </div>
        );
    }

    if (isFetching && questions.length === 0) {
        return (
            <div className="rounded-md border border-border/70 bg-background/40 px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    Checking similar questions
                </div>
                <div className="mt-3 space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="rounded-md border border-border/70 bg-background/40 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Search className="size-4 text-muted-foreground" />
                        Similar questions
                    </div>
                    {isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    No close matches found.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-md border border-border/70 bg-background/40 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Search className="size-4 text-muted-foreground" />
                    Similar questions
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
                    {questions.length} match{questions.length === 1 ? "" : "es"}
                </div>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {questions.map((question) => {
                    const correctOption = question.options.find((option) => option.isCorrect);
                    const similarOptions = question.options
                        .filter((option) => Number(option.score ?? 0) >= 18)
                        .sort((leftOption, rightOption) => Number(rightOption.score ?? 0) - Number(leftOption.score ?? 0))
                        .slice(0, 3);

                    return (
                        <div key={question.id} className="rounded-md border border-border/70 bg-background px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                                    {question.score}% similar
                                </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-foreground">
                                {question.question}
                            </p>
                            {question.body ? (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {question.body}
                                </p>
                            ) : null}
                            {similarOptions.length ? (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Similar options</p>
                                    {similarOptions.map((option) => (
                                        <div
                                            key={option.id}
                                            className="flex items-start justify-between gap-2 rounded-sm bg-muted/60 px-2 py-1 text-xs"
                                        >
                                            <span className="min-w-0 text-foreground">
                                                {option.option}
                                                {option.isCorrect ? (
                                                    <span className="ml-1 text-muted-foreground">(correct)</span>
                                                ) : (
                                                    <span className="ml-1 text-muted-foreground">(incorrect)</span>
                                                )}
                                            </span>
                                            <span className="shrink-0 text-muted-foreground">{option.score}%</span>
                                        </div>
                                    ))}
                                </div>
                            ) : correctOption ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Correct: <span className="text-foreground">{correctOption.option}</span>
                                </p>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

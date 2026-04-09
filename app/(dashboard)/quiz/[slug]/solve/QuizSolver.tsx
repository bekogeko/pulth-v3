"use client";

import {useState} from "react";
import {useQuery} from "@tanstack/react-query";

import {getQuestionsBySlug, getQuizBySlug} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Skeleton} from "@/components/ui/skeleton";
import {cn} from "@/lib/utils";

type QuizSolverProps = {
    slug: string;
};

export function QuizSolver({slug}: QuizSolverProps) {
    const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
    const {data: quizData, isLoading: isQuizLoading} = useQuery({
        queryKey: ["quiz", slug],
        queryFn: () => getQuizBySlug(slug),
    });

    const {data: questions, isLoading, isError} = useQuery({
        queryKey: ["quiz", slug, "questions"],
        queryFn: () => getQuestionsBySlug(slug),
    });

    const quiz = quizData?.[0];
    const answeredCount = Object.keys(selectedOptions).length;

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardHeader className="gap-4 border-b border-border/60 bg-gradient-to-br from-primary/8 via-background to-background">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                            {isQuizLoading ? (
                                <>
                                    <Skeleton className="h-8 w-52" />
                                    <Skeleton className="h-4 w-80 max-w-full" />
                                </>
                            ) : (
                                <>
                                    <CardTitle className="text-2xl tracking-tight">
                                        {quiz?.title ?? "Quiz"}
                                    </CardTitle>
                                    <CardDescription className="max-w-2xl text-sm leading-6">
                                        {quiz?.description ?? "Choose one answer for each question."}
                                    </CardDescription>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-3 self-start rounded-lg border border-border/70 bg-background/80 px-4 py-3 text-sm shadow-xs backdrop-blur">
                            <div className="space-y-0.5">
                                <p className="text-muted-foreground">Progress</p>
                                <p className="font-medium text-foreground">
                                    {answeredCount}/{questions?.length ?? 0} answered
                                </p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 pt-6 text-sm text-muted-foreground">
                    <span className="rounded-full bg-muted px-3 py-1">
                        {questions?.length ?? 0} questions
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1">
                        Single choice
                    </span>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({length: 3}).map((_, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}

            {isError ? (
                <Card className="border-destructive/30">
                    <CardHeader>
                        <CardTitle>Couldn&apos;t load this quiz</CardTitle>
                        <CardDescription>
                            Please refresh and try again.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            {!isLoading && !isError && questions?.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No questions yet</CardTitle>
                        <CardDescription>
                            Add questions to this quiz and they&apos;ll appear here.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            {!isLoading && !isError ? (
                <div className="space-y-4">
                    {questions?.map((question, index) => (
                        <Card key={question.id}>
                            <CardHeader className="gap-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Question {index + 1}
                                </p>
                                <CardTitle className="text-xl leading-7">
                                    {question.question}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup
                                    value={selectedOptions[question.id]}
                                    onValueChange={(value) => {
                                        setSelectedOptions((prev) => ({
                                            ...prev,
                                            [question.id]: value,
                                        }));
                                    }}
                                    className="gap-3"
                                >
                                    {question.options.map((option) => {
                                        const optionId = `question-${question.id}-option-${option.id}`;
                                        const isSelected = selectedOptions[question.id] === String(option.id);

                                        return (
                                            <Label
                                                key={option.id}
                                                htmlFor={optionId}
                                                className={cn(
                                                    "flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background px-4 py-4 transition-colors",
                                                    "hover:border-primary/40 hover:bg-primary/5",
                                                    isSelected && "border-primary bg-primary/8 shadow-sm"
                                                )}
                                            >
                                                <RadioGroupItem
                                                    id={optionId}
                                                    value={String(option.id)}
                                                    className="mt-0.5"
                                                />
                                                <span className="flex-1 text-sm leading-6 text-foreground">
                                                    {option.option}
                                                </span>
                                            </Label>
                                        );
                                    })}
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}

            {!isLoading && !isError && questions?.length ? (
                <div className="sticky bottom-4">
                    <Card className="border-border/70 bg-background/95 shadow-lg backdrop-blur">
                        <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                    {answeredCount === questions.length
                                        ? "All questions answered."
                                        : "Keep going. You can change any answer before submitting."}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {questions.length - answeredCount} remaining
                                </p>
                            </div>
                            <Button disabled={answeredCount !== questions.length} size="lg">
                                Submit Answers
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            ) : null}
        </div>
    );
}

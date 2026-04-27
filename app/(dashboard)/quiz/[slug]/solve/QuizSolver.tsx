"use client";

import {useEffect, useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowLeft, ArrowRight, Check, RotateCcw} from "lucide-react";
import {toast} from "sonner";

import {
    getConceptById,
    getQuestionConceptRatings,
    getQuestionsByConceptId,
    getQuestionsBySlug,
    getQuizBySlug,
    submitUserAnswer
} from "@/app/(dashboard)/quiz/quiz";
import type {QuestionConceptRating} from "@/app/(dashboard)/quiz/quiz";
import {QuestionBodyBlock} from "@/app/(dashboard)/quiz/QuestionBodyBlock";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Skeleton} from "@/components/ui/skeleton";
import {cn} from "@/lib/utils";

type QuizSolverProps = {
    slug?: string;
    conceptId?: number;
};

type SolverSource = {
    id: number;
    title?: string;
    name?: string;
    description: string | null;
};

function slugifyQuestion(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "question";
}

export function QuizSolver({slug, conceptId}: QuizSolverProps) {
    const queryClient = useQueryClient();
    const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
    const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [hasProcessedInitialHash, setHasProcessedInitialHash] = useState(false);
    const isConceptMode = typeof conceptId === "number";
    const sourceLabel = isConceptMode ? "Concept" : "Quiz";

    const {data: sourceData, isLoading: isSourceLoading} = useQuery<SolverSource[]>({
        queryKey: isConceptMode ? ["concept", conceptId] : ["quiz", slug],
        queryFn: () => isConceptMode ? getConceptById(conceptId) : getQuizBySlug(slug!),
        enabled: isConceptMode || Boolean(slug),
    });

    const {data: questions, isLoading, isError} = useQuery({
        queryKey: isConceptMode ? ["concept", conceptId, "questions"] : ["quiz", slug, "questions"],
        queryFn: () => isConceptMode ? getQuestionsByConceptId(conceptId) : getQuestionsBySlug(slug!),
        enabled: isConceptMode || Boolean(slug),
    });

    const questionIds = useMemo(
        () => questions?.map((question) => question.questionId) ?? [],
        [questions]
    );
    const {data: conceptRatings} = useQuery<QuestionConceptRating[]>({
        queryKey: ["question-concept-ratings", questionIds],
        queryFn: () => getQuestionConceptRatings(questionIds),
        enabled: questionIds.length > 0,
    });

    const source = sourceData?.[0];
    const title = source?.title ?? source?.name;
    const lastQuestionIndex = Math.max((questions?.length ?? 1) - 1, 0);
    const activeQuestionIndex = Math.min(currentQuestionIndex, lastQuestionIndex);
    const currentQuestion = questions?.[activeQuestionIndex];
    const currentQuestionNumber = activeQuestionIndex + 1;
    const selectedOptionId = currentQuestion ? selectedOptions[currentQuestion.questionId] : undefined;
    const isCurrentQuestionChecked = currentQuestion ? checkedQuestions[currentQuestion.questionId] : false;
    const currentConceptRatings = useMemo(() => {
        if (!currentQuestion) {
            return [];
        }

        return (conceptRatings ?? [])
            .filter((rating) => rating.questionId === currentQuestion.questionId);
    }, [conceptRatings, currentQuestion]);
    const submitAnswerMutation = useMutation({
        mutationFn: submitUserAnswer,
        onSuccess: async (result, variables) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            setCheckedQuestions((prev) => ({
                ...prev,
                [variables.questionId]: true,
            }));
            await queryClient.invalidateQueries({queryKey: ["question-concept-ratings"]});
        },
        onError: () => {
            toast.error("Unable to record your answer right now.");
        },
    });
    const correctAnswerCount = useMemo(() => {
        if (!questions?.length) {
            return 0;
        }

        return questions.filter((question) => {
            const selectedOption = question.options.find((option) => String(option.id) === selectedOptions[question.questionId]);
            return Boolean(selectedOption?.isCorrect);
        }).length;
    }, [questions, selectedOptions]);
    const answeredCount = useMemo(() => {
        if (!questions?.length) {
            return 0;
        }

        return questions.filter((question) => Boolean(selectedOptions[question.questionId])).length;
    }, [questions, selectedOptions]);
    const checkedCount = useMemo(() => {
        if (!questions?.length) {
            return 0;
        }

        return questions.filter((question) => checkedQuestions[question.questionId]).length;
    }, [checkedQuestions, questions]);
    const currentQuestionHash = currentQuestion && !isComplete ? slugifyQuestion(currentQuestion.question) : "";

    useEffect(() => {
        if (!questions?.length) {
            return;
        }

        function selectQuestionFromHash() {
            const questionHash = decodeURIComponent(window.location.hash.slice(1));

            if (!questionHash) {
                return;
            }

            const hashQuestionIndex = questions!.findIndex(
                (question) => slugifyQuestion(question.question) === questionHash
            );

            if (hashQuestionIndex === -1) {
                return;
            }

            setIsComplete(false);
            setCurrentQuestionIndex(hashQuestionIndex);
        }

        queueMicrotask(() => {
            selectQuestionFromHash();
            setHasProcessedInitialHash(true);
        });
        window.addEventListener("hashchange", selectQuestionFromHash);

        return () => {
            window.removeEventListener("hashchange", selectQuestionFromHash);
        };
    }, [questions]);

    useEffect(() => {
        if (!hasProcessedInitialHash || !currentQuestionHash) {
            return;
        }

        const nextUrl = `${window.location.pathname}${window.location.search}#${currentQuestionHash}`;

        if (window.location.hash !== `#${currentQuestionHash}`) {
            window.history.replaceState(null, "", nextUrl);
        }
    }, [currentQuestionHash, hasProcessedInitialHash]);

    function checkCurrentQuestion() {
        if (!currentQuestion || !selectedOptionId) {
            return;
        }

        submitAnswerMutation.mutate({
            questionId: currentQuestion.questionId,
            optionId: Number.parseInt(selectedOptionId, 10),
        });
    }

    function selectCurrentOption(optionId: number) {
        if (!currentQuestion || isCurrentQuestionChecked || submitAnswerMutation.isPending) {
            return;
        }

        setSelectedOptions((prev) => ({
            ...prev,
            [currentQuestion.questionId]: String(optionId),
        }));
    }

    function goToNextQuestion() {
        if (!questions?.length) {
            return;
        }

        if (activeQuestionIndex === questions.length - 1) {
            setIsComplete(true);
            return;
        }

        setCurrentQuestionIndex(activeQuestionIndex + 1);
    }

    function goToPreviousQuestion() {
        setIsComplete(false);
        setCurrentQuestionIndex(Math.max(activeQuestionIndex - 1, 0));
    }

    function restartQuiz() {
        setCurrentQuestionIndex(0);
        setSelectedOptions({});
        setCheckedQuestions({});
        setIsComplete(false);
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardHeader className="gap-4 border-b border-border/60 bg-gradient-to-br from-primary/8 via-background to-background">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                            {isSourceLoading ? (
                                <>
                                    <Skeleton className="h-8 w-52" />
                                    <Skeleton className="h-4 w-80 max-w-full" />
                                </>
                            ) : (
                                <>
                                    <CardTitle className="text-2xl tracking-tight">
                                        {title ?? sourceLabel}
                                    </CardTitle>
                                    <CardDescription className="max-w-2xl text-sm leading-6">
                                        {source?.description ?? "Choose one answer for each question."}
                                    </CardDescription>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-3 self-start rounded-lg border border-border/70 bg-background/80 px-4 py-3 text-sm shadow-xs backdrop-blur">
                            <div className="space-y-0.5">
                                <p className="text-muted-foreground">Progress</p>
                                <p className="font-medium text-foreground">
                                    {checkedCount}/{questions?.length ?? 0} solved
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
                        {isConceptMode ? "Concept practice" : "One at a time"}
                    </span>
                    {questions?.length ? (
                        <span className="rounded-full bg-muted px-3 py-1">
                            {answeredCount}/{questions.length} answered
                        </span>
                    ) : null}
                    {currentQuestion && !isComplete ? (
                        <span className="rounded-full bg-muted px-3 py-1">
                            Question {currentQuestionNumber} of {questions?.length ?? 0}
                        </span>
                    ) : null}
                    {isComplete && questions?.length ? (
                        <span className="rounded-full bg-muted px-3 py-1">
                            Score {correctAnswerCount}/{questions.length}
                        </span>
                    ) : null}
                </CardContent>
            </Card>

            {!isLoading && !isError && questions?.length && isComplete ? (
                <Card>
                    <CardHeader className="gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            Complete
                        </p>
                        <CardTitle className="text-xl leading-7">
                            You solved {questions.length} question{questions.length === 1 ? "" : "s"}.
                        </CardTitle>
                        <CardDescription>
                            {correctAnswerCount} correct and {questions.length - correctAnswerCount} incorrect.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsComplete(false);
                                setCurrentQuestionIndex(questions.length - 1);
                            }}
                        >
                            <ArrowLeft />
                            Review last question
                        </Button>
                        <Button type="button" onClick={restartQuiz}>
                            <RotateCcw />
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            {!isLoading && !isError && currentQuestion && !isComplete ? (
                <Card key={currentQuestion.questionId}>
                    <CardHeader className="gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            Question {currentQuestionNumber}
                        </p>
                        <CardTitle className="text-xl leading-7">
                            {currentQuestion.question}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <QuestionBodyBlock body={currentQuestion.body} />
                        {currentConceptRatings.length ? (
                            <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 sm:grid-cols-2">
                                {currentConceptRatings.map((rating) => (
                                    <div
                                        key={`${rating.questionId}-${rating.conceptId}`}
                                        className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm"
                                    >
                                        <span className="min-w-0 truncate font-medium text-foreground">
                                            {rating.name}
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                            <span>User {rating.userRating === null ? "-" : Math.round(rating.userRating)}</span>
                                            <span>Question {Math.round(rating.questionRating)}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <RadioGroup
                            value={selectedOptionId ?? ""}
                            onValueChange={(value) => {
                                if (isCurrentQuestionChecked || submitAnswerMutation.isPending) {
                                    return;
                                }

                                setSelectedOptions((prev) => ({
                                    ...prev,
                                    [currentQuestion.questionId]: value,
                                }));
                            }}
                            className="gap-3"
                        >
                            {currentQuestion.options.map((option) => {
                                const optionId = `question-${currentQuestion.questionId}-option-${option.id}`;
                                const isSelected = selectedOptionId === String(option.id);
                                const isCorrectSelection = isCurrentQuestionChecked && option.isCorrect;
                                const isWrongSelection = isCurrentQuestionChecked && isSelected && !option.isCorrect;

                                return (
                                    <Label
                                        key={option.id}
                                        htmlFor={optionId}
                                        aria-disabled={isCurrentQuestionChecked || submitAnswerMutation.isPending}
                                        onClick={() => selectCurrentOption(option.id)}
                                        className={cn(
                                            "flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background px-4 py-4 transition-colors",
                                            "hover:border-primary/40 hover:bg-primary/5",
                                            (isCurrentQuestionChecked || submitAnswerMutation.isPending) && "cursor-default",
                                            isSelected && !isCurrentQuestionChecked && "border-primary bg-primary/8 shadow-sm",
                                            isCorrectSelection && "border-green-500/60 bg-green-500/10",
                                            isWrongSelection && "border-destructive/60 bg-destructive/10"
                                        )}
                                    >
                                        <RadioGroupItem
                                            id={optionId}
                                            value={String(option.id)}
                                            className="mt-0.5"
                                            disabled={isCurrentQuestionChecked || submitAnswerMutation.isPending}
                                        />
                                        <span className="flex-1 text-sm leading-6 text-foreground">
                                            {option.option}
                                        </span>
                                    </Label>
                                );
                            })}
                        </RadioGroup>

                        {isCurrentQuestionChecked ? (
                            <div
                                className={cn(
                                    "rounded-lg border px-4 py-3 text-sm",
                                    currentQuestion.options.find((option) => String(option.id) === selectedOptionId)?.isCorrect
                                        ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                                        : "border-destructive/40 bg-destructive/10 text-destructive"
                                )}
                            >
                                {currentQuestion.options.find((option) => String(option.id) === selectedOptionId)?.isCorrect
                                    ? "Correct."
                                    : "Incorrect. The correct answer is highlighted."}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={goToPreviousQuestion}
                                disabled={activeQuestionIndex === 0}
                            >
                                <ArrowLeft />
                                Previous
                            </Button>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                {!isCurrentQuestionChecked ? (
                                    <Button
                                        type="button"
                                        onClick={checkCurrentQuestion}
                                        disabled={!selectedOptionId || submitAnswerMutation.isPending}
                                    >
                                        <Check />
                                        {submitAnswerMutation.isPending ? "Saving..." : "Check answer"}
                                    </Button>
                                ) : (
                                    <Button type="button" onClick={goToNextQuestion}>
                                        {activeQuestionIndex === (questions?.length ?? 0) - 1 ? "Finish" : "Next question"}
                                        <ArrowRight />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

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
                            {isConceptMode
                                ? "Attach questions to this concept and they&apos;ll appear here."
                                : "Add questions to this quiz and they&apos;ll appear here."}
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

        </div>
    );
}

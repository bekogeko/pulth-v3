"use client";

import {useActionState, useDeferredValue, useEffect, useMemo, useRef, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Loader2, Plus, Search, Trash2} from "lucide-react";
import {toast} from "sonner";

import {createQuestion, getAllConcepts, getAllQuizzes, getSimilarQuestions} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Skeleton} from "@/components/ui/skeleton";
import {Textarea} from "@/components/ui/textarea";

type CreateQuestionDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type CreateQuestionState = Awaited<ReturnType<typeof createQuestion>>;

const INITIAL_STATE: CreateQuestionState = {status: "idle"};
const INITIAL_OPTIONS = ["", ""];

export function CreateQuestionDialog({
    open,
    onOpenChange,
}: CreateQuestionDialogProps) {
    const queryClient = useQueryClient();
    const [state, formAction, pending] = useActionState(createQuestion, INITIAL_STATE);
    const similarityConfirmationRef = useRef(false);
    const [options, setOptions] = useState<string[]>(INITIAL_OPTIONS);
    const [prompt, setPrompt] = useState("");
    const [body, setBody] = useState("");
    const [correctIndex, setCorrectIndex] = useState(0);
    const [conceptQuery, setConceptQuery] = useState("");
    const [quizQuery, setQuizQuery] = useState("");
    const [selectedConceptIds, setSelectedConceptIds] = useState<number[]>([]);
    const [selectedQuizIds, setSelectedQuizIds] = useState<number[]>([]);
    const deferredConceptQuery = useDeferredValue(conceptQuery);
    const deferredQuizQuery = useDeferredValue(quizQuery);
    const deferredPrompt = useDeferredValue(prompt);
    const deferredBody = useDeferredValue(body);
    const deferredOptions = useDeferredValue(options);
    const similarQuestionInput = useMemo(() => ({
        prompt: deferredPrompt,
        body: deferredBody,
        options: deferredOptions,
    }), [deferredBody, deferredOptions, deferredPrompt]);

    const {data: concepts, isLoading: conceptsLoading} = useQuery({
        queryKey: ["concepts"],
        queryFn: getAllConcepts,
        enabled: open,
    });

    const {data: quizzes, isLoading: quizzesLoading} = useQuery({
        queryKey: ["quizzes"],
        queryFn: getAllQuizzes,
        enabled: open,
    });

    const normalizedSimilaritySearch = [
        deferredPrompt,
        deferredBody,
        ...deferredOptions,
    ].join(" ").trim();
    const shouldCheckSimilarQuestions = open && normalizedSimilaritySearch.length >= 8;
    const {
        data: similarQuestions,
        isFetching: similarQuestionsFetching,
    } = useQuery({
        queryKey: ["questions", "similar", similarQuestionInput],
        queryFn: () => getSimilarQuestions(similarQuestionInput),
        enabled: shouldCheckSimilarQuestions,
        staleTime: 30_000,
    });

    useEffect(() => {
        if (state.status !== "success") {
            return;
        }

        void Promise.all([
            queryClient.invalidateQueries({queryKey: ["quizzes", "self"]}),
            queryClient.invalidateQueries({queryKey: ["quizzes"]}),
            queryClient.invalidateQueries({queryKey: ["quiz"]}),
        ]).then(() => {
            toast.success(state.message ?? "Question created.");
            onOpenChange(false);
        });
    }, [onOpenChange, queryClient, state.message, state.status]);

    const normalizedConceptQuery = deferredConceptQuery.trim().toLowerCase();
    const normalizedQuizQuery = deferredQuizQuery.trim().toLowerCase();
    const filteredConcepts = (concepts ?? []).filter((concept) =>
        concept.name.toLowerCase().includes(normalizedConceptQuery)
    );
    const filteredQuizzes = (quizzes ?? []).filter((quiz) =>
        [quiz.title, quiz.description, quiz.slug].some((value) =>
            value.toLowerCase().includes(normalizedQuizQuery)
        )
    );
    const highSimilarityQuestions = (similarQuestions ?? []).filter((question) => question.score >= 50);

    function handleOpenChange(nextOpen: boolean) {
        if (pending) {
            return;
        }

        onOpenChange(nextOpen);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        if (highSimilarityQuestions.length === 0) {
            return;
        }

        if (similarityConfirmationRef.current) {
            similarityConfirmationRef.current = false;
            return;
        }

        event.preventDefault();

        const confirmed = window.confirm(
            `${highSimilarityQuestions.length} question${highSimilarityQuestions.length === 1 ? "" : "s"} ` +
            "look at least 50% similar. Create this question anyway?"
        );

        if (!confirmed) {
            return;
        }

        similarityConfirmationRef.current = true;
        event.currentTarget.requestSubmit();
    }

    function addOption() {
        setOptions((currentOptions) => [...currentOptions, ""]);
    }

    function updateOption(index: number, value: string) {
        setOptions((currentOptions) => {
            const nextOptions = [...currentOptions];
            nextOptions[index] = value;
            return nextOptions;
        });
    }

    function removeOption(index: number) {
        setOptions((currentOptions) => currentOptions.filter((_, currentIndex) => currentIndex !== index));
        setCorrectIndex((currentCorrectIndex) => {
            if (currentCorrectIndex === index) {
                return Math.max(0, index - 1);
            }

            if (currentCorrectIndex > index) {
                return currentCorrectIndex - 1;
            }

            return currentCorrectIndex;
        });
    }

    function toggleConcept(conceptId: number) {
        setSelectedConceptIds((currentConceptIds) => {
            if (currentConceptIds.includes(conceptId)) {
                return currentConceptIds.filter((id) => id !== conceptId);
            }

            return [...currentConceptIds, conceptId];
        });
    }

    function toggleQuiz(quizId: number) {
        setSelectedQuizIds((currentQuizIds) => {
            if (currentQuizIds.includes(quizId)) {
                return currentQuizIds.filter((id) => id !== quizId);
            }

            return [...currentQuizIds, quizId];
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="flex max-h-[90vh] flex-col sm:max-w-4xl"
                showCloseButton={!pending}
            >
                <DialogHeader>
                    <DialogTitle>Create Question</DialogTitle>
                    <DialogDescription>
                        Add the prompt, answer choices, concepts, and quiz attachments in one pass.
                    </DialogDescription>
                </DialogHeader>

                <form action={formAction} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-6">
                    {selectedConceptIds.map((conceptId) => (
                        <input key={`selected-concept-${conceptId}`} type="hidden" name="conceptIds[]" value={conceptId} />
                    ))}
                    {selectedQuizIds.map((quizId) => (
                        <input key={`selected-quiz-${quizId}`} type="hidden" name="quizIds[]" value={quizId} />
                    ))}

                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span>{options.length} option{options.length === 1 ? "" : "s"}</span>
                        <span>{selectedConceptIds.length} concept{selectedConceptIds.length === 1 ? "" : "s"} linked</span>
                        <span>{selectedQuizIds.length} quiz{selectedQuizIds.length === 1 ? "" : "zes"} attached</span>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                        <div className="space-y-6">
                            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                <div className="space-y-2">
                                    <Label htmlFor="question-prompt">Question</Label>
                                    <Input
                                        id="question-prompt"
                                        name="prompt"
                                        value={prompt}
                                        onChange={(event) => setPrompt(event.target.value)}
                                        placeholder="e.g. What is polymorphism?"
                                        required
                                        maxLength={255}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="question-body">Body</Label>
                                    <Textarea
                                        id="question-body"
                                        name="body"
                                        value={body}
                                        onChange={(event) => setBody(event.target.value)}
                                        placeholder="Optional supporting context, snippet, or note."
                                        maxLength={1024}
                                        rows={6}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Optional. Up to 1024 characters.
                                    </p>
                                </div>

                                <SimilarQuestionsPanel
                                    enabled={shouldCheckSimilarQuestions}
                                    isFetching={similarQuestionsFetching}
                                    questions={similarQuestions ?? []}
                                />
                            </section>

                            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium">Answer choices</p>
                                        <p className="text-xs text-muted-foreground">
                                            Choose one correct option before saving.
                                        </p>
                                    </div>
                                    <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                                        <Plus className="size-4" />
                                        Add option
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {options.map((option, index) => (
                                        <div key={`create-option-${index}`} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="correctOption"
                                                value={String(index)}
                                                checked={correctIndex === index}
                                                onChange={() => setCorrectIndex(index)}
                                                aria-label={`Mark option ${index + 1} as correct`}
                                                className="h-4 w-4 border border-input text-primary focus:ring-2 focus:ring-ring/40"
                                            />
                                            <Input
                                                name="options[]"
                                                placeholder={`Option ${index + 1}`}
                                                value={option}
                                                onChange={(event) => updateOption(index, event.target.value)}
                                                maxLength={255}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={() => removeOption(index)}
                                                disabled={options.length === 1}
                                                aria-label={`Remove option ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium">Concepts</p>
                                        <p className="text-xs text-muted-foreground">
                                            Link any concepts that this question should reinforce.
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedConceptIds.length} selected
                                    </p>
                                </div>

                                <Input
                                    value={conceptQuery}
                                    onChange={(event) => setConceptQuery(event.target.value)}
                                    placeholder="Search concepts..."
                                    aria-label="Search concepts"
                                />

                                {conceptsLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading concepts...</p>
                                ) : filteredConcepts.length ? (
                                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                        {filteredConcepts.map((concept) => (
                                            <label
                                                key={concept.id}
                                                className="flex cursor-pointer items-center gap-3 rounded-md border border-border/70 px-3 py-2 transition-colors hover:bg-muted/40"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedConceptIds.includes(concept.id)}
                                                    onChange={() => toggleConcept(concept.id)}
                                                    className="h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring/30"
                                                />
                                                <span className="text-sm text-foreground">{concept.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : concepts?.length ? (
                                    <p className="text-sm text-muted-foreground">
                                        No concepts match your search.
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No concepts are available yet.
                                    </p>
                                )}
                            </section>

                            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium">Quiz attachments</p>
                                        <p className="text-xs text-muted-foreground">
                                            Attach the question anywhere it should appear right away.
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedQuizIds.length} selected
                                    </p>
                                </div>

                                <Input
                                    value={quizQuery}
                                    onChange={(event) => setQuizQuery(event.target.value)}
                                    placeholder="Search quizzes..."
                                    aria-label="Search quizzes"
                                />

                                {quizzesLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading quizzes...</p>
                                ) : filteredQuizzes.length ? (
                                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                        {filteredQuizzes.map((quiz) => {
                                            const questionCount = Number(quiz.questionCount);
                                            const hasQuestionCount = Number.isFinite(questionCount);

                                            return (
                                                <label
                                                    key={quiz.id}
                                                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 px-3 py-3 transition-colors hover:bg-muted/40"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedQuizIds.includes(quiz.id)}
                                                        onChange={() => toggleQuiz(quiz.id)}
                                                        className="mt-1 h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring/30"
                                                    />
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-medium text-foreground">
                                                                {quiz.title}
                                                            </span>
                                                            {hasQuestionCount ? (
                                                                <span className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                                    {questionCount} question{questionCount === 1 ? "" : "s"}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {quiz.description || "No description provided."}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : quizzes?.length ? (
                                    <p className="text-sm text-muted-foreground">
                                        No quizzes match your search.
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No quizzes are available yet. You can still create the question and attach it later.
                                    </p>
                                )}
                            </section>
                        </div>
                    </div>

                    {state.status === "error" ? (
                        <p className="text-sm text-destructive">{state.message}</p>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            {pending ? "Creating..." : "Create question"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type SimilarQuestionsPanelProps = {
    enabled: boolean;
    isFetching: boolean;
    questions: Awaited<ReturnType<typeof getSimilarQuestions>>;
};

function SimilarQuestionsPanel({
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
                    const quizTitles = question.quizzes.map((quiz) => quiz.title).join(", ");

                    return (
                        <div key={question.id} className="rounded-md border border-border/70 bg-background px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                                    {question.score}% similar
                                </span>
                                {quizTitles ? (
                                    <span className="min-w-0 truncate text-[0.7rem] text-muted-foreground">
                                        {quizTitles}
                                    </span>
                                ) : null}
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

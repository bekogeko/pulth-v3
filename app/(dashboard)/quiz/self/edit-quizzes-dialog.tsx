"use client";

import {useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Link2, Link2Off, RotateCcw} from "lucide-react";
import {toast} from "sonner";

import {getAllQuizzes, getQuizzesByQuestionId} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";

type QuizSummary = {
    id: number;
    title: string;
    description: string;
    slug?: string;
    questionCount?: number | string;
};

type EditQuizzesDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    question: string;
    body: string | null;
    questionId: number;
    quizzes: QuizSummary[];
};

export function EditQuizzesDialog({
    open,
    onOpenChange,
    question,
    body,
    questionId,
    quizzes,
}: EditQuizzesDialogProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedQuizIds, setSelectedQuizIds] = useState<number[]>(() => quizzes.map((quiz) => quiz.id));

    const {data: attachedQuizzes, isLoading: attachedIsLoading} = useQuery({
        queryKey: ["quizzes", "questionId", questionId],
        queryFn: () => getQuizzesByQuestionId(questionId),
        initialData: quizzes,
        enabled: open,
    });

    const {data: allQuizzes, isLoading: quizzesLoading} = useQuery({
        queryKey: ["quizzes"],
        queryFn: () => getAllQuizzes(),
        enabled: open,
    });

    const initialSelectedQuizIds = quizzes.map((quiz) => quiz.id);
    const selectedQuizIdSet = new Set(selectedQuizIds);
    const initialSelectedQuizIdSet = new Set(initialSelectedQuizIds);
    const quizLookup = new Map<number, QuizSummary>();

    for (const quiz of quizzes) {
        quizLookup.set(quiz.id, quiz);
    }

    for (const quiz of attachedQuizzes ?? []) {
        quizLookup.set(quiz.id, quiz);
    }

    for (const quiz of allQuizzes ?? []) {
        quizLookup.set(quiz.id, quiz);
    }

    const attachedQuizRecords = (allQuizzes ?? attachedQuizzes ?? quizzes).filter((quiz) =>
        selectedQuizIdSet.has(quiz.id)
    );
    const unattachedQuizzes = (allQuizzes ?? []).filter((quiz) => !selectedQuizIdSet.has(quiz.id));
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredUnattachedQuizzes = unattachedQuizzes.filter((quiz) => {
        if (!normalizedQuery) {
            return true;
        }

        return [
            quiz.title,
            quiz.description,
            quiz.slug,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    const addedQuizIds = selectedQuizIds.filter((quizId) => !initialSelectedQuizIdSet.has(quizId));
    const removedQuizIds = initialSelectedQuizIds.filter((quizId) => !selectedQuizIdSet.has(quizId));
    const hasPendingChanges = addedQuizIds.length > 0 || removedQuizIds.length > 0;

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            setSearchQuery("");
        }

        onOpenChange(nextOpen);
    }

    function attachQuiz(quizId: number) {
        setSelectedQuizIds((currentQuizIds) => {
            if (currentQuizIds.includes(quizId)) {
                return currentQuizIds;
            }

            return [...currentQuizIds, quizId];
        });
    }

    function detachQuiz(quizId: number) {
        setSelectedQuizIds((currentQuizIds) => currentQuizIds.filter((id) => id !== quizId));
    }

    function resetDraft() {
        setSearchQuery("");
        setSelectedQuizIds(initialSelectedQuizIds);
    }

    function saveLocally() {
        const nextAttachedQuizzes = selectedQuizIds
            .map((quizId) => quizLookup.get(quizId))
            .filter((quiz): quiz is QuizSummary => Boolean(quiz));
        const nextQuestionQuizzes = nextAttachedQuizzes.map((quiz) => ({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            slug: quiz.slug ?? "",
        }));

        queryClient.setQueryData(["quizzes", "questionId", questionId], nextAttachedQuizzes);
        queryClient.setQueryData(
            ["quizzes", "self"],
            (currentData: Array<{
                id: number;
                quizzes: {
                    id: number;
                    title: string;
                    description: string;
                    slug: string;
                }[];
            }> | undefined) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.map((question) =>
                    question.id === questionId
                        ? {
                            ...question,
                            quizzes: nextQuestionQuizzes,
                        }
                        : question
                );
            }
        );
        queryClient.setQueryData(
            ["quizzes"],
            (currentData: Array<{
                id: number;
                slug: string;
                title: string;
                description: string;
                questionCount: number | string;
            }> | undefined) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.map((quiz) => {
                    if (addedQuizIds.includes(quiz.id)) {
                        return {
                            ...quiz,
                            questionCount: Number(quiz.questionCount) + 1,
                        };
                    }

                    if (removedQuizIds.includes(quiz.id)) {
                        return {
                            ...quiz,
                            questionCount: Math.max(0, Number(quiz.questionCount) - 1),
                        };
                    }

                    return quiz;
                });
            }
        );

        toast.success("Quiz links updated locally.", {
            description: "These changes stay in the UI until the page reloads.",
        });
        handleOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Quizzes</DialogTitle>
                    <DialogDescription>
                        Attach and detach quizzes locally without changing the backend yet.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span>{selectedQuizIds.length} attached in draft</span>
                        <span>{addedQuizIds.length} to attach</span>
                        <span>{removedQuizIds.length} to detach</span>
                    </div>

                    <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Question
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                            {question}
                        </p>

                        {body ? (
                            <div className="mt-3 border-t border-border/70 pt-3">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Body
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                    {body}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium">Attached quizzes</p>
                                <p className="text-xs text-muted-foreground">
                                    Quizzes in the current draft attachment set.
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {attachedQuizRecords.length} total
                            </p>
                        </div>

                        {attachedIsLoading ? (
                            <p className="text-sm text-muted-foreground">Loading attached quizzes...</p>
                        ) : attachedQuizRecords.length ? (
                            <div className="space-y-2">
                                {attachedQuizRecords.map((quiz) => {
                                    const questionCount = "questionCount" in quiz && quiz.questionCount !== undefined
                                        ? Number(quiz.questionCount)
                                        : null;

                                    return (
                                        <div
                                            key={quiz.id}
                                            className="rounded-md border border-border/70 bg-muted/20 px-3 py-3"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium text-foreground">
                                                    {quiz.title}
                                                </p>
                                                <span className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    Attached
                                                </span>
                                                {questionCount !== null ? (
                                                    <span className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                        {questionCount} question{questionCount === 1 ? "" : "s"}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {quiz.description || "No description provided."}
                                            </p>
                                            <div className="mt-3 flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => detachQuiz(quiz.id)}
                                                >
                                                    <Link2Off className="size-4" />
                                                    Detach
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                                This question is not attached to any quizzes yet.
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium">Unattached quizzes</p>
                                <p className="text-xs text-muted-foreground">
                                    Search quizzes that are outside the current draft.
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {unattachedQuizzes.length} available
                            </p>
                        </div>

                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search unattached quizzes..."
                            aria-label="Search unattached quizzes"
                        />

                        {quizzesLoading ? (
                            <p className="text-sm text-muted-foreground">Loading quizzes...</p>
                        ) : unattachedQuizzes.length === 0 ? (
                            <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                                Every quiz is already attached to this question.
                            </p>
                        ) : filteredUnattachedQuizzes.length ? (
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                {filteredUnattachedQuizzes.map((quiz) => {
                                    const questionCount = Number(quiz.questionCount);

                                    return (
                                        <div
                                            key={quiz.id}
                                            className="rounded-md border border-border/70 px-3 py-3 transition-colors hover:bg-muted/20"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium text-foreground">
                                                    {quiz.title}
                                                </p>
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    Not attached
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                    {questionCount} question{questionCount === 1 ? "" : "s"}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {quiz.description || "No description provided."}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                /quiz/{quiz.slug}
                                            </p>
                                            <div className="mt-3 flex justify-end">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => attachQuiz(quiz.id)}
                                                >
                                                    <Link2 className="size-4" />
                                                    Attach
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                                No unattached quizzes match your search.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={resetDraft}
                        disabled={!hasPendingChanges}
                    >
                        <RotateCcw className="size-4" />
                        Reset
                    </Button>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={saveLocally} disabled={!hasPendingChanges}>
                        Save locally
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import {useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowRightLeft, CheckCircle2, Trash2} from "lucide-react";
import {toast} from "sonner";

import {
    adminDiscardQuestion,
    getAdminCurriculumBindings,
    getAdminPendingQuestions,
} from "@/app/actions/admin";
import {ConfirmDialog} from "@/app/admin/confirm-dialog";
import {MigrateQuestionDialog} from "@/app/admin/questions/migrate/migrate-question-dialog";
import {Button} from "@/components/ui/button";
import {Skeleton} from "@/components/ui/skeleton";

type PendingQuestion = Awaited<ReturnType<typeof getAdminPendingQuestions>>[number];

export default function AdminMigrateQuestionsPage() {
    const queryClient = useQueryClient();
    const [migrateTarget, setMigrateTarget] = useState<PendingQuestion | null>(null);
    const [discardTarget, setDiscardTarget] = useState<PendingQuestion | null>(null);

    const {data: questions, isLoading} = useQuery({
        queryKey: ["admin", "questions", "pending"],
        queryFn: getAdminPendingQuestions,
    });

    const {data: bindings} = useQuery({
        queryKey: ["admin", "curriculums", "concept-bindings"],
        queryFn: getAdminCurriculumBindings,
    });

    const curriculums = useMemo(() => bindings?.curriculums ?? [], [bindings?.curriculums]);
    const pendingQuestions = questions ?? [];

    const discardMutation = useMutation({
        mutationFn: (questionId: number) => adminDiscardQuestion(questionId),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "questions", "pending"]});
            toast.success(result.message);
            setDiscardTarget(null);
        },
        onError: () => {
            toast.error("Unable to discard the question right now.");
        },
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold">Migrate questions</h2>
                <p className="text-sm text-muted-foreground">
                    Legacy questions waiting to be assigned a curriculum and concepts. Migrating one
                    moves it into the live bank; discarding removes it for good.
                </p>
            </div>

            {migrateTarget ? (
                <MigrateQuestionDialog
                    open
                    question={migrateTarget}
                    curriculums={curriculums}
                    onOpenChange={(open) => {
                        if (!open) {
                            setMigrateTarget(null);
                        }
                    }}
                />
            ) : null}

            {discardTarget ? (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setDiscardTarget(null);
                        }
                    }}
                    title="Discard question"
                    description={`"${discardTarget.question}" will be permanently deleted. Questions with submitted answers cannot be discarded.`}
                    confirmLabel="Discard question"
                    isPending={discardMutation.isPending}
                    onConfirm={() => discardMutation.mutate(discardTarget.id)}
                />
            ) : null}

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({length: 4}).map((_, index) => (
                        <Skeleton key={index} className="h-40 w-full rounded-xl" />
                    ))}
                </div>
            ) : pendingQuestions.length ? (
                <div className="space-y-4">
                    {pendingQuestions.map((question) => (
                        <article
                            key={question.id}
                            className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold leading-snug">
                                        {question.question}
                                    </h3>
                                    {question.body ? (
                                        <p className="line-clamp-2 text-sm text-muted-foreground">
                                            {question.body}
                                        </p>
                                    ) : null}
                                </div>

                                <ul className="space-y-1">
                                    {question.options.map((option) => (
                                        <li
                                            key={option.id}
                                            className="flex items-center gap-2 text-sm text-muted-foreground"
                                        >
                                            {option.isCorrect ? (
                                                <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                                            ) : (
                                                <span className="size-3.5 shrink-0 rounded-full border border-input" />
                                            )}
                                            <span className="min-w-0 truncate">{option.option}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    {question.concepts.length ? (
                                        question.concepts.map((concept) => (
                                            <span
                                                key={concept.id}
                                                className="rounded-md bg-muted px-2 py-0.5"
                                            >
                                                {concept.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="rounded-md border border-dashed px-2 py-0.5">
                                            No concept tags
                                        </span>
                                    )}
                                    <span>·</span>
                                    <span>{question.options.length} option{question.options.length === 1 ? "" : "s"}</span>
                                </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={curriculums.length === 0}
                                    title={curriculums.length === 0 ? "Create a curriculum first" : undefined}
                                    onClick={() => setMigrateTarget(question)}
                                >
                                    <ArrowRightLeft className="size-4" />
                                    Migrate
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Discard ${question.question}`}
                                    onClick={() => setDiscardTarget(question)}
                                >
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="flex h-48 items-center justify-center rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground shadow-sm">
                    No questions are waiting to be migrated.
                </div>
            )}
        </div>
    );
}

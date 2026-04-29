"use client";

import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {ColumnDef} from "@tanstack/react-table";
import {Loader2, MoreHorizontal, Trash2} from "lucide-react";
import {toast} from "sonner";

import {EditConceptsDialog} from "@/app/(dashboard)/quiz/self/edit-concepts-dialog";
import {EditOptionsDialog} from "@/app/(dashboard)/quiz/self/edit-options-dialog";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {EditQuizzesDialog} from "@/app/(dashboard)/quiz/self/edit-quizzes-dialog";
import {deleteQuestion} from "@/app/(dashboard)/quiz/quiz";

export type Question = {
    id: number;
    question: string;
    body: string | null;
    quizzes: {
        id: number;
        title: string;
        description: string;
        slug?: string;
    }[];
    options: {
        id: number;
        option: string;
        isCorrect: boolean;
    }[];
    concepts: {
        id: number;
        name: string;
    }[];
};

const VISIBLE_CONCEPTS_LIMIT = 4;

export const columns: ColumnDef<Question>[] = [
    {
        accessorKey: "id",
        header: "ID",
    },
    {
        id: "actions",
        cell: ({row}) => {
            const question = row.original;

            return <RowActions question={question}/>;
        },
    },
    {
        accessorKey: "question",
        header: "Question",
    },
    {
        accessorKey: "quizzes",
        accessorFn: (question) => question.quizzes.map((quiz) => quiz.title).join(", "),
        header: "Quizzes",
    },
    {
        accessorKey: "options",
        accessorFn: (question) => question.options.length,
        header: "Options",
    },
    {
        accessorKey: "concepts",
        header: "Concepts",
        cell: ({row}) => <ConceptsCell concepts={row.original.concepts}/>,
    },
];

function ConceptsCell({concepts}: { concepts: Question["concepts"] }) {
    if (!concepts.length) {
        return <span className="text-muted-foreground">-</span>;
    }

    const visibleConcepts = concepts.slice(0, VISIBLE_CONCEPTS_LIMIT);
    const hiddenConcepts = concepts.slice(VISIBLE_CONCEPTS_LIMIT);
    const hiddenCount = hiddenConcepts.length;
    const hiddenConceptNames = hiddenConcepts.map((concept) => concept.name).join(", ");
    const hiddenConceptLabel = `${hiddenCount} more concept${hiddenCount === 1 ? "" : "s"}`;

    return (
        <div className="flex max-w-xs flex-wrap gap-1 whitespace-normal sm:max-w-sm lg:max-w-lg">
            {visibleConcepts.map((concept) => (
                <span
                    key={concept.id}
                    className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[11px] leading-none text-muted-foreground"
                >
                    {concept.name}
                </span>
            ))}
            {hiddenCount > 0 ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                            tabIndex={0}
                            className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[11px] leading-none text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                        >
                            {hiddenConceptLabel}
                            <span className="sr-only">: {hiddenConceptNames}</span>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-sm whitespace-normal">
                        {hiddenConceptNames}
                    </TooltipContent>
                </Tooltip>
            ) : null}
        </div>
    );
}

function RowActions({question}: { question: Question }) {
    const queryClient = useQueryClient();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
    const [isQuizzesDialogOpen, setIsQuizzesDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const deleteQuestionMutation = useMutation({
        mutationFn: () => deleteQuestion({questionId: question.id}),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await Promise.all([
                queryClient.invalidateQueries({queryKey: ["quizzes"]}),
                queryClient.invalidateQueries({queryKey: ["quizzes", "self"]}),
                queryClient.invalidateQueries({queryKey: ["quiz"]}),
            ]);

            toast.success(result.message);
            setIsDeleteDialogOpen(false);
        },
        onError: () => {
            toast.error("Unable to delete the question right now.");
        },
    });

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onSelect={() => setIsQuizzesDialogOpen(true)}>
                        Edit Quizzes
                    </DropdownMenuItem><DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                        Edit Concepts
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsOptionDialogOpen(true)}>
                        Edit Options
                    </DropdownMenuItem>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="size-4"/>
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {isEditDialogOpen ? (
                <EditConceptsDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    questionId={question.id}
                    question={question.question}
                    body={question.body}
                    concepts={question.concepts}
                />
            ) : null}

            {isOptionDialogOpen ? (
                <EditOptionsDialog
                    open={isOptionDialogOpen}
                    onOpenChange={setIsOptionDialogOpen}
                    questionId={question.id}
                    question={question.question}
                    body={question.body}
                    options={question.options}
                />
            ) : null}

            {isQuizzesDialogOpen ? (
                <EditQuizzesDialog
                    open={isQuizzesDialogOpen}
                    onOpenChange={setIsQuizzesDialogOpen}
                    question={question.question}
                    body={question.body}
                    questionId={question.id}
                    quizzes={question.quizzes}
                />
            ) : null}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete question?</DialogTitle>
                        <DialogDescription>
                            This will remove the question, its answer choices, concept links, and quiz links.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Question
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">
                            {question.question}
                        </p>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={deleteQuestionMutation.isPending}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => deleteQuestionMutation.mutate()}
                            disabled={deleteQuestionMutation.isPending}
                        >
                            {deleteQuestionMutation.isPending ? (
                                <Loader2 className="size-4 animate-spin"/>
                            ) : (
                                <Trash2 className="size-4"/>
                            )}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

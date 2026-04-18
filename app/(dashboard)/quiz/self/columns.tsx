"use client";

import {useState} from "react";
import {ColumnDef} from "@tanstack/react-table";
import {MoreHorizontal} from "lucide-react";

import {EditConceptsDialog} from "@/app/(dashboard)/quiz/self/edit-concepts-dialog";
import {EditOptionsDialog} from "@/app/(dashboard)/quiz/self/edit-options-dialog";
import {Button} from "@/components/ui/button";
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

export type Question = {
    id: number;
    question: string;
    body: string | null;
    quizzes: {
        id: number;
        title: string;
        description: string;
        slug: string
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
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
    const [isQuizzesDialogOpen, setIsQuizzesDialogOpen] = useState(false);

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
        </>
    );
}

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
        accessorFn: (question) => question.concepts.map((concept) => concept.name).join(", "),
        header: "Concepts",
    },
];

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

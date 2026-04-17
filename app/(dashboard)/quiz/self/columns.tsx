"use client";

import {useState} from "react";

import {ColumnDef} from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {MoreHorizontal} from "lucide-react";
import {EditConceptsDialog} from "@/app/(dashboard)/quiz/self/edit-concepts-dialog";

export type Quiz = {
    id: number
    question: string,
    body: string | null,
    options:{
        id: number
        option: string
        isCorrect: boolean
    }[],
    concepts:{
        id: number,
        name: string
    }[]
}

export const columns: ColumnDef<Quiz>[] =[
    {
        accessorKey: "id",
        header:"ID"
    },
    {
        id:"actions",
        cell: ({row,})=>{
            const quiz = row.original

            return <RowActions quiz={quiz} />
        }
    },
    {
        accessorKey: "question",
        header:"Question"
    },
    {
        accessorKey: "options",
        accessorFn:(opt)=>{
            return opt.options.length
        },
        header:"Options"
    },{
        accessorKey:"concepts",
        accessorFn:(concept)=>{
          return concept.concepts.map(c=>c.name).join(", ")
        },
        header:"Concepts"
    },


]

function RowActions({quiz}: {quiz: Quiz}) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => alert(quiz.id)}
                    >
                        Copy payment ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                        Edit Concepts
                    </DropdownMenuItem>
                    <DropdownMenuItem>View Options</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {isEditDialogOpen ? (
                <EditConceptsDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    questionId={quiz.id}
                    question={quiz.question}
                    body={quiz.body}
                    concepts={quiz.concepts}
                />
            ) : null}
        </>
    );
}

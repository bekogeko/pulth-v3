"use client";

import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Plus} from "lucide-react";

import {getMyQuestions} from "@/app/(dashboard)/quiz/quiz";
import {DataTable, DataTableSkeleton} from "@/app/(dashboard)/quiz/self/data-table";
import {columns} from "@/app/(dashboard)/quiz/self/columns";
import {CreateQuestionDialog} from "@/app/(dashboard)/quiz/self/create-question-dialog";
import {Button} from "@/components/ui/button";


export default function Quiz() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const {data: questions, isLoading} = useQuery({
        queryKey: ["quizzes", "self"],
        queryFn: getMyQuestions,
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">My Questions</h2>
                    <p className="text-sm text-muted-foreground">
                        Create questions, manage answer choices, and attach them to concepts or quizzes from one place.
                    </p>
                </div>
                <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="size-4" />
                    Create question
                </Button>
            </div>

            {isCreateDialogOpen ? (
                <CreateQuestionDialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                />
            ) : null}

            {isLoading ? <DataTableSkeleton columnCount={columns.length} /> :
                <DataTable columns={columns} data={questions ?? []}/>}
        </div>
    );
}

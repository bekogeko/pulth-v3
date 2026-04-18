"use client";

import {useQuery} from "@tanstack/react-query";
import { getMyQuestions} from "@/app/(dashboard)/quiz/quiz";
import {DataTable} from "@/app/(dashboard)/quiz/self/data-table";
import {columns} from "@/app/(dashboard)/quiz/self/columns";


export default function Quiz() {
    const {data: quizzes, isLoading} = useQuery({
        queryKey: ["quizzes","self"],
        queryFn: getMyQuestions,
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Quizzes</h2>
                    <p className="text-sm text-muted-foreground">
                        Browse every quiz, check how many questions it has, and jump into editing or solving.
                    </p>
                </div>
            </div>
            {isLoading ? <p>Loading...</p>:
                <DataTable columns={columns} data={quizzes!}/>}

        </div>
    );
}

"use client";

import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Plus, Trash2, X} from "lucide-react";
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

type QuestionOption = {
    id: number;
    option: string;
    isCorrect: boolean;
};

type EditOptionsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    question: string;
    body: string | null;
    questionId: number;
    quizzes:{
        id: number;
        title: string;
        description: string;
        slug: string
    }[];
};

export function EditQuizzesDialog({
                                      open,
                                      onOpenChange,
                                      question,
                                      body,
                                      questionId,
                                     quizzes,
                                  }: EditOptionsDialogProps) {


    const {data,isLoading} = useQuery({
        queryKey:["quizzes","questionId",questionId],
        queryFn: ()=>getQuizzesByQuestionId(questionId),
        initialData:quizzes,
        enabled:open,
    });

    const {data:allQuizzes,isLoading:quizzesLoading} = useQuery({
        queryKey:["quizzes"],
        queryFn: ()=>getAllQuizzes(),
        enabled:open,
    });



    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Quizzes</DialogTitle>
                    <DialogDescription>
                        Modify or attach new quizzes to question.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
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
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Attached Quizzes</p>
                                <p className="text-xs text-muted-foreground">
                                    Select the quizzes to get attached.
                                </p>
                            </div>
                        </div>
                        {
                            isLoading ? (<p>Loading</p>):(<p>{data&&data.map((quiz)=>quiz.title)}</p>)
                        }

                        {data.map((quiz) => {
                            const questionCount = "questionCount" in quiz ? Number(quiz.questionCount) : null;

                            return (
                                <div
                                    key={quiz.id}
                                    className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-3"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-foreground">
                                                {quiz.title}
                                            </p>
                                            {questionCount !== null ? (
                                                <span className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                            {questionCount} question{questionCount === 1 ? "" : "s"}
                                                        </span>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {quiz.description}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => toggleQuiz(quiz.id)}
                                        aria-label={`Remove ${quiz.title}`}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            );
                        })}

                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>

                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

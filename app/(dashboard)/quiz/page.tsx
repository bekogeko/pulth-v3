"use client";

import {useActionState, useEffect, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {createQuestion, getAllQuizzes, getAllTopicsWithConcepts} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {QuizList} from "@/app/(dashboard)/quiz/QuizList";
import {TopicList} from "@/app/(dashboard)/quiz/TopicList";
import {Input} from "@/components/ui/input";
import {Select} from "@/components/ui/select";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {CheckCircle2, Loader2, Plus} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {toast} from "sonner";
import Link from "next/link";

type CreateQuestionState = Awaited<ReturnType<typeof createQuestion>>;
type Quizzes = Awaited<ReturnType<typeof getAllQuizzes>>;

export default function Quiz() {
    const {data: quizzes, isLoading} = useQuery({
        queryKey: ["quizzes"],
        queryFn: getAllQuizzes,
    });
    const {data: topics, isLoading: topicsLoading} = useQuery({
        queryKey: ["topics", "concepts"],
        queryFn: getAllTopicsWithConcepts,
    });

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex justify-start">
                <Button variant={"link"}>
                    <Link href={"/quiz/self"} className="flex items-center gap-2">
                        My Questions
                    </Link>
                </Button>
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Quizzes</h2>
                    <p className="text-sm text-muted-foreground">
                        Browse every quiz, check how many questions it has, and jump into editing or solving.
                    </p>
                </div>
                <QuizList quizzes={quizzes} isLoading={isLoading} />
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Topics</h2>
                    <p className="text-sm text-muted-foreground">
                        Browse topics and solve questions for one concept at a time.
                    </p>
                </div>
                <TopicList topics={topics} isLoading={topicsLoading} />
            </div>
        </div>
    );
}

function CreateQuestionForm({
    quizzes,
    isLoading,
    onSuccess,
}: {
    quizzes: Quizzes | undefined;
    isLoading: boolean;
    onSuccess: () => void;
}) {
    const initialState: CreateQuestionState = {status: "idle"};
    const [state, formAction, pending] = useActionState(createQuestion, initialState);
    const queryClient = useQueryClient();
    const [correctIndex, setCorrectIndex] = useState(0);
    const [options, setOptions] = useState<string[]>([]);

    useEffect(() => {
        if (state.status !== "success") {
            return;
        }

        void queryClient.invalidateQueries({queryKey: ["quizzes"]}).then(() => {
            toast.success("Question added successfully.");
            onSuccess();
        });
    }, [onSuccess, queryClient, state.status]);

    return (
        <Card className="max-w-none border-0 shadow-none">
            <CardHeader>
                <CardTitle>Create Question</CardTitle>
                <CardDescription>Add a prompt and multiple-choice options to a quiz.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="quizId">Quiz</Label>
                        <Select name="quizId" id="quizId" required defaultValue="">
                            <option value="" disabled>Choose a quiz</option>
                            {isLoading && <option>Loading...</option>}
                            {quizzes?.map((quiz) => (
                                <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prompt">Prompt</Label>
                        <Input id="prompt" name="prompt" placeholder="e.g. What is polymorphism?" required />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Options</Label>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>{setOptions([...options,""])}}
                            >
                                <Plus className="size-4" />
                                Add option
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Mark one option as correct.</p>
                        <div className="space-y-2">
                            {options.map((id, idx) => (
                                <div key={`option-${idx}`} className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="correctOption"
                                        value={"options-"+idx}
                                        checked={correctIndex === idx}
                                        onChange={() => setCorrectIndex(idx)}
                                        required={idx === 0}
                                        className="h-4 w-4 border border-input text-primary focus:ring-2 focus:ring-ring/40"
                                    />
                                    <Input
                                        name="options[]"
                                        placeholder={`Option ${idx + 1}`}
                                        className="flex-1"
                                        value={id}
                                        onChange={(e) => {
                                            setOptions((prev) => {
                                                const newOptions = [...prev];
                                                newOptions[idx] = e.target.value;
                                                return newOptions;
                                            });
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setOptions((prev) => prev.filter((_, i) => i !== idx));
                                            if (correctIndex === idx) {
                                                setCorrectIndex(Math.max(0, idx - 1));
                                            } else if (correctIndex > idx) {
                                                setCorrectIndex(correctIndex - 1);
                                            }
                                        }}
                                    >
                                        X
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={pending || isLoading}>
                            {pending ? <Loader2 className="animate-spin" /> : "Create"}
                        </Button>
                        {state.status === "error" && (
                            <p className="text-sm text-destructive">{state.message}</p>
                        )}
                        {state.status === "success" && (
                            <p className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="size-4" /> Saved</p>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

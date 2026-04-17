"use client";

import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import {updateQuestionOptions} from "@/app/(dashboard)/quiz/quiz";
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
    questionId: number;
    question: string;
    body: string | null;
    options: QuestionOption[];
};

export function EditOptionsDialog({
    open,
    onOpenChange,
    questionId,
    question,
    body,
    options,
}: EditOptionsDialogProps) {
    const queryClient = useQueryClient();
    const [editedOptions, setEditedOptions] = useState<string[]>(() => options.map((option) => option.option));
    const [correctIndex, setCorrectIndex] = useState(() => {
        const nextCorrectIndex = options.findIndex((option) => option.isCorrect);
        return nextCorrectIndex >= 0 ? nextCorrectIndex : 0;
    });

    const updateOptionsMutation = useMutation({
        mutationFn: () =>
            updateQuestionOptions({
                questionId,
                options: editedOptions,
                correctIndex,
            }),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["quizzes", "self"]});
            toast.success(result.message);
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Unable to update options right now.");
        },
    });

    function addOption() {
        setEditedOptions((currentOptions) => [...currentOptions, ""]);
    }

    function updateOption(index: number, value: string) {
        setEditedOptions((currentOptions) => {
            const nextOptions = [...currentOptions];
            nextOptions[index] = value;
            return nextOptions;
        });
    }

    function removeOption(index: number) {
        setEditedOptions((currentOptions) => currentOptions.filter((_, currentIndex) => currentIndex !== index));

        setCorrectIndex((currentCorrectIndex) => {
            if (currentCorrectIndex === index) {
                return Math.max(0, index - 1);
            }

            if (currentCorrectIndex > index) {
                return currentCorrectIndex - 1;
            }

            return currentCorrectIndex;
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Options</DialogTitle>
                    <DialogDescription>
                        Update the answer choices and choose which option is correct.
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
                                <p className="text-sm font-medium">Answer choices</p>
                                <p className="text-xs text-muted-foreground">
                                    Select the radio button for the correct option.
                                </p>
                            </div>
                            <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                                <Plus className="size-4" />
                                Add option
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {editedOptions.length ? (
                                editedOptions.map((option, index) => (
                                    <div key={`question-option-${index}`} className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="correct-option"
                                            aria-label={`Mark option ${index + 1} as correct`}
                                            checked={correctIndex === index}
                                            onChange={() => setCorrectIndex(index)}
                                            className="h-4 w-4 border border-input text-primary focus:ring-2 focus:ring-ring/40"
                                        />
                                        <Input
                                            value={option}
                                            onChange={(event) => updateOption(index, event.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() => removeOption(index)}
                                            disabled={editedOptions.length === 1}
                                            aria-label={`Remove option ${index + 1}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Add at least one option before saving.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={() => updateOptionsMutation.mutate()}
                        disabled={updateOptionsMutation.isPending}
                    >
                        {updateOptionsMutation.isPending ? "Saving..." : "Save options"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

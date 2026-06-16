"use client";

import {useState} from "react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useRouter} from "next/navigation";
import {useUser} from "@clerk/nextjs";
import {Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import {adminCreateQuestion, getIsAdmin} from "@/app/actions/admin";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

type AddQuestionButtonProps = {
    curriculumId: number;
    conceptId: number;
    conceptName: string;
};

const INITIAL_OPTIONS = ["", ""];

export function AddQuestionButton({curriculumId, conceptId, conceptName}: AddQuestionButtonProps) {
    const {isLoaded, isSignedIn} = useUser();
    const [open, setOpen] = useState(false);

    // The admin role lives in Clerk private metadata the browser cannot read, so
    // ask the server. Keeping this client-side leaves the topic page static.
    const {data: isAdmin} = useQuery({
        queryKey: ["admin", "is-admin"],
        queryFn: getIsAdmin,
        enabled: isLoaded && isSignedIn,
        staleTime: 5 * 60 * 1000,
    });

    if (!isAdmin) {
        return null;
    }

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setOpen(true)}
            >
                <Plus />
                Add question
            </Button>
            {open ? (
                <AddQuestionDialog
                    open
                    curriculumId={curriculumId}
                    conceptId={conceptId}
                    conceptName={conceptName}
                    onOpenChange={setOpen}
                />
            ) : null}
        </>
    );
}

type AddQuestionDialogProps = AddQuestionButtonProps & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

function AddQuestionDialog({
    open,
    onOpenChange,
    curriculumId,
    conceptId,
    conceptName,
}: AddQuestionDialogProps) {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [body, setBody] = useState("");
    const [explanation, setExplanation] = useState("");
    const [options, setOptions] = useState<string[]>(INITIAL_OPTIONS);
    const [correctIndex, setCorrectIndex] = useState(0);

    const createMutation = useMutation({
        mutationFn: () => adminCreateQuestion({
            curriculumId,
            conceptIds: [conceptId],
            prompt,
            body,
            explanation,
            options,
            correctIndex,
        }),
        onSuccess: (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            onOpenChange(false);
            // The topic page is statically rendered; refresh to pull the
            // revalidated question counts.
            router.refresh();
        },
        onError: () => {
            toast.error("Unable to create the question right now.");
        },
    });

    function addOption() {
        setOptions((current) => [...current, ""]);
    }

    function updateOption(index: number, value: string) {
        setOptions((current) => {
            const next = [...current];
            next[index] = value;
            return next;
        });
    }

    function removeOption(index: number) {
        setOptions((current) => current.filter((_, currentIndex) => currentIndex !== index));
        setCorrectIndex((current) => {
            if (current === index) {
                return Math.max(0, index - 1);
            }

            if (current > index) {
                return current - 1;
            }

            return current;
        });
    }

    const trimmedOptions = options.map((option) => option.trim());
    const canSubmit = prompt.trim().length > 0
        && trimmedOptions.length >= 2
        && trimmedOptions.every((option) => option.length > 0)
        && !createMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={(next) => (createMutation.isPending ? null : onOpenChange(next))}>
            <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl" showCloseButton={!createMutation.isPending}>
                <DialogHeader>
                    <DialogTitle>Add question</DialogTitle>
                    <DialogDescription>
                        New question for <span className="font-medium text-foreground">{conceptName}</span>, scoped to this curriculum.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSubmit) {
                            createMutation.mutate();
                        }
                    }}
                    className="flex min-h-0 flex-1 flex-col gap-5"
                >
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                        <div className="space-y-2">
                            <Label htmlFor="add-question-prompt">Question</Label>
                            <Input
                                id="add-question-prompt"
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                placeholder="e.g. What is polymorphism?"
                                maxLength={255}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-question-body">Body</Label>
                            <Textarea
                                id="add-question-body"
                                value={body}
                                onChange={(event) => setBody(event.target.value)}
                                placeholder="Optional supporting context."
                                maxLength={1024}
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-question-explanation">Explanation</Label>
                            <Textarea
                                id="add-question-explanation"
                                value={explanation}
                                onChange={(event) => setExplanation(event.target.value)}
                                placeholder="Optional. Shown after answering."
                                maxLength={255}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">Answer choices</p>
                                    <p className="text-xs text-muted-foreground">
                                        Choose one correct option before saving.
                                    </p>
                                </div>
                                <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                                    <Plus className="size-4" />
                                    Add option
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {options.map((option, index) => (
                                    <div key={`add-option-${index}`} className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="add-question-correct"
                                            checked={correctIndex === index}
                                            onChange={() => setCorrectIndex(index)}
                                            aria-label={`Mark option ${index + 1} as correct`}
                                            className="h-4 w-4 border border-input text-primary focus:ring-2 focus:ring-ring/40"
                                        />
                                        <Input
                                            value={option}
                                            onChange={(event) => updateOption(index, event.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            maxLength={255}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() => removeOption(index)}
                                            disabled={options.length <= 2}
                                            aria-label={`Remove option ${index + 1}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!canSubmit}>
                            {createMutation.isPending ? "Creating..." : "Create question"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

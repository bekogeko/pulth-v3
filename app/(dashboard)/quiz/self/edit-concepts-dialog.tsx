"use client";

import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {getAllConcepts, updateQuestionConcepts} from "@/app/(dashboard)/quiz/quiz";
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
import {toast} from "sonner";

type EditConceptsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    questionId: number;
    question: string;
    body: string | null;
    concepts: {id: number; name: string}[];
};

export function EditConceptsDialog({
    open,
    onOpenChange,
    questionId,
    question,
    body,
    concepts,
}: EditConceptsDialogProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedConceptIds, setSelectedConceptIds] = useState<number[]>(
        () => concepts.map((concept) => concept.id)
    );

    const {data: allConcepts, isLoading: isConceptsLoading} = useQuery({
        queryKey: ["concepts"],
        queryFn: getAllConcepts,
        enabled: open,
    });

    const updateConceptsMutation = useMutation({
        mutationFn: () =>
            updateQuestionConcepts({
                questionId,
                conceptIds: selectedConceptIds,
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
            toast.error("Unable to update concepts right now.");
        },
    });

    function toggleConcept(conceptId: number) {
        setSelectedConceptIds((currentConceptIds) => {
            if (currentConceptIds.includes(conceptId)) {
                return currentConceptIds.filter((id) => id !== conceptId);
            }

            return [...currentConceptIds, conceptId];
        });
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredConcepts = allConcepts?.filter((concept) =>
        concept.name.toLowerCase().includes(normalizedQuery)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Concepts</DialogTitle>
                    <DialogDescription>
                        Update the concepts linked to this question.
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
                            <p className="text-sm font-medium">Available concepts</p>
                            <p className="text-xs text-muted-foreground">
                                {selectedConceptIds.length} selected
                            </p>
                        </div>

                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search concepts..."
                            aria-label="Search concepts"
                        />

                        {isConceptsLoading ? (
                            <p className="text-sm text-muted-foreground">Loading concepts...</p>
                        ) : filteredConcepts?.length ? (
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                {filteredConcepts.map((concept) => {
                                    const checked = selectedConceptIds.includes(concept.id);

                                    return (
                                        <label
                                            key={concept.id}
                                            className="flex cursor-pointer items-center gap-3 rounded-md border border-border/70 px-3 py-2 transition-colors hover:bg-muted/40"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleConcept(concept.id)}
                                                className="h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring/30"
                                            />
                                            <span className="text-sm text-foreground">
                                                {concept.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : allConcepts?.length ? (
                            <p className="text-sm text-muted-foreground">
                                No concepts match your search.
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No concepts are available yet.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={() => updateConceptsMutation.mutate()}
                        disabled={isConceptsLoading || updateConceptsMutation.isPending}
                    >
                        {updateConceptsMutation.isPending ? "Saving..." : "Save concepts"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

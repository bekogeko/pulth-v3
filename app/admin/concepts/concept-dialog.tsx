"use client";

import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";

import {createConcept, updateConcept} from "@/app/actions/admin";
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

type ConceptDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    concept?: {
        id: number;
        name: string;
        description: string | null;
    };
};

export function ConceptDialog({open, onOpenChange, concept}: ConceptDialogProps) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(concept?.name ?? "");
    const [description, setDescription] = useState(concept?.description ?? "");

    const saveMutation = useMutation({
        mutationFn: () => concept
            ? updateConcept({id: concept.id, name, description})
            : createConcept({name, description}),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "concepts"]});
            await queryClient.invalidateQueries({queryKey: ["concepts"]});
            toast.success(result.message);
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Unable to save the concept right now.");
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        saveMutation.mutate();
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>{concept ? "Edit concept" : "Create concept"}</DialogTitle>
                        <DialogDescription>
                            {concept
                                ? "Update the concept. Renaming it regenerates the slug."
                                : "Concepts link questions and articles together for ratings."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="concept-name">Name</Label>
                        <Input
                            id="concept-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={255}
                            required
                            placeholder="Concept name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="concept-description">Description (optional)</Label>
                        <Textarea
                            id="concept-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            maxLength={255}
                            placeholder="Short concept description"
                            className="min-h-24"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saveMutation.isPending}>
                            {saveMutation.isPending
                                ? "Saving..."
                                : concept ? "Save concept" : "Create concept"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

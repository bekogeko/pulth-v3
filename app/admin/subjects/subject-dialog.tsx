"use client";

import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";

import {createSubject, updateSubject} from "@/app/actions/admin";
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

type SubjectDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subject?: {
        id: number;
        name: string;
    };
};

export function SubjectDialog({open, onOpenChange, subject}: SubjectDialogProps) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(subject?.name ?? "");

    const saveMutation = useMutation({
        mutationFn: () => subject
            ? updateSubject({id: subject.id, name})
            : createSubject({name}),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "subjects"]});
            toast.success(result.message);
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Unable to save the subject right now.");
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        saveMutation.mutate();
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>{subject ? "Edit subject" : "Create subject"}</DialogTitle>
                        <DialogDescription>
                            Subjects are the top level of the topic taxonomy.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="subject-name">Name</Label>
                        <Input
                            id="subject-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={255}
                            required
                            placeholder="Subject name"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saveMutation.isPending}>
                            {saveMutation.isPending
                                ? "Saving..."
                                : subject ? "Save subject" : "Create subject"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import {useActionState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {createArticleDraft} from "@/app/actions/article";
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

type CreateArticleDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const initialState = {
    status: "idle" as const,
};

export function CreateArticleDialog({open, onOpenChange}: CreateArticleDialogProps) {
    const router = useRouter();
    const [state, action, isPending] = useActionState(createArticleDraft, initialState);

    useEffect(() => {
        if (state.status === "success" && state.slug) {
            toast.success(state.message ?? "Article draft created.");
            onOpenChange(false);
            router.push(`/articles/${state.slug}/edit`);
        }

        if (state.status === "error" && state.message) {
            toast.error(state.message);
        }
    }, [onOpenChange, router, state]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form action={action} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Create article</DialogTitle>
                        <DialogDescription>
                            Start with the title and description. Concepts and topics can be attached on the edit page.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="article-title">Title</Label>
                        <Input
                            id="article-title"
                            name="title"
                            maxLength={255}
                            required
                            placeholder="Article title"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="article-description">Description</Label>
                        <Textarea
                            id="article-description"
                            name="description"
                            required
                            placeholder="Short article description"
                            className="min-h-24"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create draft"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

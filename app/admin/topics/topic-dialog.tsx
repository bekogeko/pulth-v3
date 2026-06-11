"use client";

import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";

import {createTopic, getAdminSubjects, updateTopic} from "@/app/actions/admin";
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
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";

type TopicDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    topic?: {
        id: number;
        title: string;
        description: string;
        subjectId: number;
    };
};

export function TopicDialog({open, onOpenChange, topic}: TopicDialogProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(topic?.title ?? "");
    const [description, setDescription] = useState(topic?.description ?? "");
    const [subjectId, setSubjectId] = useState(topic ? String(topic.subjectId) : "");

    const {data: subjects, isLoading: isSubjectsLoading} = useQuery({
        queryKey: ["admin", "subjects"],
        queryFn: getAdminSubjects,
    });

    const saveMutation = useMutation({
        mutationFn: () => topic
            ? updateTopic({id: topic.id, subjectId: Number(subjectId), title, description})
            : createTopic({subjectId: Number(subjectId), title, description}),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "topics"]});
            toast.success(result.message);
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Unable to save the topic right now.");
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
                        <DialogTitle>{topic ? "Edit topic" : "Create topic"}</DialogTitle>
                        <DialogDescription>
                            {topic
                                ? "Update the topic. Renaming it regenerates the slug."
                                : "Topics group articles under a subject."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="topic-subject">Subject</Label>
                        <Select
                            id="topic-subject"
                            value={subjectId}
                            onChange={(event) => setSubjectId(event.target.value)}
                            required
                            disabled={isSubjectsLoading}
                        >
                            <option value="" disabled>
                                {isSubjectsLoading ? "Loading subjects..." : "Select a subject"}
                            </option>
                            {subjects?.map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                        </Select>
                        {!isSubjectsLoading && !subjects?.length ? (
                            <p className="text-xs text-muted-foreground">
                                No subjects yet. Create a subject first.
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="topic-title">Title</Label>
                        <Input
                            id="topic-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            maxLength={255}
                            required
                            placeholder="Topic title"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="topic-description">Description</Label>
                        <Textarea
                            id="topic-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            maxLength={255}
                            required
                            placeholder="Short topic description"
                            className="min-h-24"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saveMutation.isPending || !subjectId}>
                            {saveMutation.isPending
                                ? "Saving..."
                                : topic ? "Save topic" : "Create topic"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

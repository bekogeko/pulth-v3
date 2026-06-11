"use client";

import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import {deleteTopic, getAdminTopics} from "@/app/actions/admin";
import {ConfirmDialog} from "@/app/admin/confirm-dialog";
import {TopicDialog} from "@/app/admin/topics/topic-dialog";
import {Button} from "@/components/ui/button";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type AdminTopic = Awaited<ReturnType<typeof getAdminTopics>>[number];

export default function AdminTopicsPage() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<AdminTopic | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminTopic | null>(null);

    const {data: topics, isLoading} = useQuery({
        queryKey: ["admin", "topics"],
        queryFn: getAdminTopics,
    });

    const deleteMutation = useMutation({
        mutationFn: (topicId: number) => deleteTopic(topicId),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "topics"]});
            toast.success(result.message);
            setDeleteTarget(null);
        },
        onError: () => {
            toast.error("Unable to delete the topic right now.");
        },
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Topics</h2>
                    <p className="text-sm text-muted-foreground">
                        Topics group articles under a subject.
                    </p>
                </div>
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="size-4"/>
                    Create topic
                </Button>
            </div>

            {isCreateOpen ? (
                <TopicDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsCreateOpen(false);
                        }
                    }}
                />
            ) : null}

            {editTarget ? (
                <TopicDialog
                    open
                    topic={editTarget}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditTarget(null);
                        }
                    }}
                />
            ) : null}

            {deleteTarget ? (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteTarget(null);
                        }
                    }}
                    title="Delete topic"
                    description={`"${deleteTarget.title}" will be detached from all articles and deleted. This cannot be undone.`}
                    confirmLabel="Delete topic"
                    isPending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                />
            ) : null}

            {isLoading ? (
                <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="space-y-3 p-4">
                        {Array.from({length: 6}).map((_, index) => (
                            <Skeleton key={index} className="h-12 w-full"/>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Articles</TableHead>
                                <TableHead className="w-24 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topics?.length ? topics.map((topic) => (
                                <TableRow key={topic.id}>
                                    <TableCell>
                                        <div className="max-w-sm space-y-1">
                                            <div className="font-medium">{topic.title}</div>
                                            <div className="line-clamp-1 text-xs text-muted-foreground">
                                                {topic.description}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {topic.subjectName}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {topic.slug}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {topic.articleCount}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Edit ${topic.title}`}
                                                onClick={() => setEditTarget(topic)}
                                            >
                                                <Pencil className="size-4"/>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Delete ${topic.title}`}
                                                onClick={() => setDeleteTarget(topic)}
                                            >
                                                <Trash2 className="size-4 text-destructive"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No topics yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}

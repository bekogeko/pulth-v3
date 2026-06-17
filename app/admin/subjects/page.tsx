"use client";

import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import {deleteSubject, getAdminSubjects} from "@/app/actions/admin";
import {ConfirmDialog} from "@/app/admin/confirm-dialog";
import {SubjectDialog} from "@/app/admin/subjects/subject-dialog";
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

type AdminSubject = Awaited<ReturnType<typeof getAdminSubjects>>[number];

export default function AdminSubjectsPage() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<AdminSubject | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminSubject | null>(null);

    const {data: subjects, isLoading} = useQuery({
        queryKey: ["admin", "subjects"],
        queryFn: getAdminSubjects,
    });

    const deleteMutation = useMutation({
        mutationFn: (subjectId: number) => deleteSubject(subjectId),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "subjects"]});
            toast.success(result.message);
            setDeleteTarget(null);
        },
        onError: () => {
            toast.error("Unable to delete the subject right now.");
        },
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Subjects</h2>
                    <p className="text-sm text-muted-foreground">
                        Subjects are the top level of the topic taxonomy.
                    </p>
                </div>
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="size-4"/>
                    Create subject
                </Button>
            </div>

            {isCreateOpen ? (
                <SubjectDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsCreateOpen(false);
                        }
                    }}
                />
            ) : null}

            {editTarget ? (
                <SubjectDialog
                    open
                    subject={editTarget}
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
                    title="Delete subject"
                    description={`"${deleteTarget.name}" and all of its topics will be permanently deleted. This cannot be undone.`}
                    confirmLabel="Delete subject"
                    isPending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                />
            ) : null}

            {isLoading ? (
                <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="space-y-3 p-4">
                        {Array.from({length: 4}).map((_, index) => (
                            <Skeleton key={index} className="h-12 w-full"/>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-24 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjects?.length ? subjects.map((subject) => (
                                <TableRow key={subject.id}>
                                    <TableCell className="font-medium">{subject.name}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Edit ${subject.name}`}
                                                onClick={() => setEditTarget(subject)}
                                            >
                                                <Pencil className="size-4"/>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Delete ${subject.name}`}
                                                onClick={() => setDeleteTarget(subject)}
                                            >
                                                <Trash2 className="size-4 text-destructive"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                                        No subjects yet.
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

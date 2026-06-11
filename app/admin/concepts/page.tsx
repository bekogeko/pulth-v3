"use client";

import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import {deleteConcept, getAdminConcepts} from "@/app/actions/admin";
import {ConceptDialog} from "@/app/admin/concepts/concept-dialog";
import {ConfirmDialog} from "@/app/admin/confirm-dialog";
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

type AdminConcept = Awaited<ReturnType<typeof getAdminConcepts>>[number];

export default function AdminConceptsPage() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<AdminConcept | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminConcept | null>(null);

    const {data: concepts, isLoading} = useQuery({
        queryKey: ["admin", "concepts"],
        queryFn: getAdminConcepts,
    });

    const deleteMutation = useMutation({
        mutationFn: (conceptId: number) => deleteConcept(conceptId),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "concepts"]});
            await queryClient.invalidateQueries({queryKey: ["concepts"]});
            toast.success(result.message);
            setDeleteTarget(null);
        },
        onError: () => {
            toast.error("Unable to delete the concept right now.");
        },
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Concepts</h2>
                    <p className="text-sm text-muted-foreground">
                        Concepts connect questions and articles, and power the rating system.
                    </p>
                </div>
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="size-4"/>
                    Create concept
                </Button>
            </div>

            {isCreateOpen ? (
                <ConceptDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsCreateOpen(false);
                        }
                    }}
                />
            ) : null}

            {editTarget ? (
                <ConceptDialog
                    open
                    concept={editTarget}
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
                    title="Delete concept"
                    description={`"${deleteTarget.name}" will be detached from all questions, articles, and topics. Concepts with rating history cannot be deleted.`}
                    confirmLabel="Delete concept"
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
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead className="w-24 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {concepts?.length ? concepts.map((concept) => (
                                <TableRow key={concept.id}>
                                    <TableCell className="font-medium">{concept.name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {concept.slug}
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                        <span className="line-clamp-1 text-sm text-muted-foreground">
                                            {concept.description || "-"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {concept.questionCount} questions, {concept.articleCount} articles
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Edit ${concept.name}`}
                                                onClick={() => setEditTarget(concept)}
                                            >
                                                <Pencil className="size-4"/>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Delete ${concept.name}`}
                                                onClick={() => setDeleteTarget(concept)}
                                            >
                                                <Trash2 className="size-4 text-destructive"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No concepts yet.
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

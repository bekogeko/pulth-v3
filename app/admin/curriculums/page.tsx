"use client";

import {useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Link2, Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import {
    adminBindCurriculumConcept,
    adminSetCurriculumTopicConcept,
    adminUnbindCurriculumConcept,
    getAdminCurriculumBindings,
} from "@/app/actions/admin";
import {ConfirmDialog} from "@/app/admin/confirm-dialog";
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
import {Skeleton} from "@/components/ui/skeleton";
import {Textarea} from "@/components/ui/textarea";

type CurriculumBindingsData = Awaited<ReturnType<typeof getAdminCurriculumBindings>>;
type AdminCurriculum = CurriculumBindingsData["curriculums"][number];
type AdminBoundConcept = AdminCurriculum["boundConcepts"][number];
type AdminGlobalConcept = CurriculumBindingsData["concepts"][number];

type BindingDialogState = {
    curriculum: AdminCurriculum;
    concept?: AdminBoundConcept;
};

type UnbindTarget = {
    curriculum: AdminCurriculum;
    concept: AdminBoundConcept;
};

function conceptDisplayName(concept: AdminBoundConcept) {
    return concept.localName || concept.name;
}

function conceptDescription(concept: AdminBoundConcept) {
    return concept.localDescription || concept.globalDescription || "No description";
}

function matchesConceptSearch(concept: AdminBoundConcept, query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    return [
        concept.name,
        concept.localName,
        concept.slug,
        concept.localDescription,
        concept.globalDescription,
    ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function AdminCurriculumsPage() {
    const queryClient = useQueryClient();
    const [selectedCurriculumId, setSelectedCurriculumId] = useState("");
    const [selectedTopicId, setSelectedTopicId] = useState("");
    const [conceptSearch, setConceptSearch] = useState("");
    const [topicConceptSearch, setTopicConceptSearch] = useState("");
    const [bindingDialog, setBindingDialog] = useState<BindingDialogState | null>(null);
    const [unbindTarget, setUnbindTarget] = useState<UnbindTarget | null>(null);

    const {data, isLoading} = useQuery({
        queryKey: ["admin", "curriculums", "concept-bindings"],
        queryFn: getAdminCurriculumBindings,
    });

    const curriculums = useMemo(() => data?.curriculums ?? [], [data?.curriculums]);
    const concepts = useMemo(() => data?.concepts ?? [], [data?.concepts]);

    const selectedCurriculum = useMemo(() => {
        if (!curriculums.length) {
            return null;
        }

        return curriculums.find((item) => String(item.id) === selectedCurriculumId) ?? curriculums[0];
    }, [curriculums, selectedCurriculumId]);

    const selectedTopic = useMemo(() => {
        if (!selectedCurriculum?.topics.length) {
            return null;
        }

        return selectedCurriculum.topics.find((topic) => String(topic.id) === selectedTopicId)
            ?? selectedCurriculum.topics[0];
    }, [selectedCurriculum, selectedTopicId]);

    const filteredBoundConcepts = useMemo(() => {
        return selectedCurriculum?.boundConcepts.filter((concept) => (
            matchesConceptSearch(concept, conceptSearch)
        )) ?? [];
    }, [conceptSearch, selectedCurriculum]);

    const filteredTopicConcepts = useMemo(() => {
        return selectedCurriculum?.boundConcepts.filter((concept) => (
            matchesConceptSearch(concept, topicConceptSearch)
        )) ?? [];
    }, [selectedCurriculum, topicConceptSearch]);

    const unboundConceptCount = useMemo(() => {
        if (!selectedCurriculum) {
            return 0;
        }

        const boundIds = new Set(selectedCurriculum.boundConcepts.map((concept) => concept.id));

        return concepts.filter((concept) => !boundIds.has(concept.id)).length;
    }, [concepts, selectedCurriculum]);

    const topicConceptMutation = useMutation({
        mutationFn: adminSetCurriculumTopicConcept,
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "curriculums", "concept-bindings"]});
            toast.success(result.message);
        },
        onError: () => {
            toast.error("Unable to update the topic binding right now.");
        },
    });

    const unbindMutation = useMutation({
        mutationFn: adminUnbindCurriculumConcept,
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "curriculums", "concept-bindings"]});
            toast.success(result.message);
            setUnbindTarget(null);
        },
        onError: () => {
            toast.error("Unable to remove the concept binding right now.");
        },
    });

    const selectedCurriculumValue = selectedCurriculum ? String(selectedCurriculum.id) : "";
    const selectedTopicValue = selectedTopic ? String(selectedTopic.id) : "";

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Curriculums</h2>
                    <p className="text-sm text-muted-foreground">
                        Bind concepts to curriculums and place them inside curriculum topics.
                    </p>
                </div>
                <Button
                    type="button"
                    disabled={!selectedCurriculum || unboundConceptCount === 0}
                    onClick={() => {
                        if (selectedCurriculum) {
                            setBindingDialog({curriculum: selectedCurriculum});
                        }
                    }}
                >
                    <Plus className="size-4"/>
                    Bind concept
                </Button>
            </div>

            {bindingDialog ? (
                <CurriculumConceptDialog
                    open
                    state={bindingDialog}
                    concepts={concepts}
                    onOpenChange={(open) => {
                        if (!open) {
                            setBindingDialog(null);
                        }
                    }}
                />
            ) : null}

            {unbindTarget ? (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setUnbindTarget(null);
                        }
                    }}
                    title="Unbind concept"
                    description={`"${conceptDisplayName(unbindTarget.concept)}" will be removed from "${unbindTarget.curriculum.name}" and detached from its curriculum topics.`}
                    confirmLabel="Unbind concept"
                    isPending={unbindMutation.isPending}
                    onConfirm={() => unbindMutation.mutate({
                        curriculumId: unbindTarget.curriculum.id,
                        conceptId: unbindTarget.concept.id,
                    })}
                />
            ) : null}

            {isLoading ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Skeleton className="h-72 w-full rounded-xl"/>
                    <Skeleton className="h-72 w-full rounded-xl"/>
                </div>
            ) : curriculums.length ? (
                <>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,24rem)_1fr] sm:items-end">
                            <div className="space-y-2">
                                <Label htmlFor="admin-curriculum">Curriculum</Label>
                                <Select
                                    id="admin-curriculum"
                                    value={selectedCurriculumValue}
                                    onChange={(event) => {
                                        setSelectedCurriculumId(event.target.value);
                                        setSelectedTopicId("");
                                        setConceptSearch("");
                                        setTopicConceptSearch("");
                                    }}
                                >
                                    {curriculums.map((curriculumItem) => (
                                        <option key={curriculumItem.id} value={curriculumItem.id}>
                                            {curriculumItem.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            {selectedCurriculum ? (
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span className="rounded-md border px-2 py-1">
                                        {selectedCurriculum.subjectName ?? "No subject"}
                                    </span>
                                    <span className="rounded-md border px-2 py-1">
                                        {selectedCurriculum.boundConcepts.length} concepts
                                    </span>
                                    <span className="rounded-md border px-2 py-1">
                                        {selectedCurriculum.topics.length} topics
                                    </span>
                                    <span className="rounded-md border px-2 py-1">
                                        {selectedCurriculum.slug}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {selectedCurriculum ? (
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
                                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-base font-semibold">Curriculum concepts</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedCurriculum.boundConcepts.length} bound, {unboundConceptCount} available
                                        </p>
                                    </div>
                                    <Input
                                        value={conceptSearch}
                                        onChange={(event) => setConceptSearch(event.target.value)}
                                        placeholder="Search concepts..."
                                        aria-label="Search curriculum concepts"
                                        className="sm:w-56"
                                    />
                                </div>

                                {filteredBoundConcepts.length ? (
                                    <div className="divide-y">
                                        {filteredBoundConcepts.map((concept) => (
                                            <div
                                                key={concept.id}
                                                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                                            >
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                        <p className="min-w-0 truncate text-sm font-medium">
                                                            {conceptDisplayName(concept)}
                                                        </p>
                                                        {concept.localName ? (
                                                            <span className="rounded-md bg-muted px-2 py-0.5 text-[0.65rem] text-muted-foreground">
                                                                local
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {concept.localName ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            Global: {concept.name}
                                                        </p>
                                                    ) : null}
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                                        {conceptDescription(concept)}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span>{concept.slug}</span>
                                                        <span>{concept.topicIds.length} topic placements</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        aria-label={`Edit ${conceptDisplayName(concept)}`}
                                                        onClick={() => setBindingDialog({
                                                            curriculum: selectedCurriculum,
                                                            concept,
                                                        })}
                                                    >
                                                        <Pencil className="size-4"/>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        aria-label={`Unbind ${conceptDisplayName(concept)}`}
                                                        onClick={() => setUnbindTarget({
                                                            curriculum: selectedCurriculum,
                                                            concept,
                                                        })}
                                                    >
                                                        <Trash2 className="size-4 text-destructive"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex h-40 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                                        {selectedCurriculum.boundConcepts.length
                                            ? "No concepts match your search."
                                            : "No concepts are bound to this curriculum yet."}
                                    </div>
                                )}
                            </section>

                            <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
                                <div className="space-y-4 border-b p-4">
                                    <div className="flex items-center gap-2">
                                        <Link2 className="size-4 text-primary"/>
                                        <h3 className="text-base font-semibold">Topic placement</h3>
                                    </div>
                                    {selectedCurriculum.topics.length ? (
                                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                            <div className="space-y-2">
                                                <Label htmlFor="admin-curriculum-topic">Topic</Label>
                                                <Select
                                                    id="admin-curriculum-topic"
                                                    value={selectedTopicValue}
                                                    onChange={(event) => setSelectedTopicId(event.target.value)}
                                                >
                                                    {selectedCurriculum.topics.map((topic) => (
                                                        <option key={topic.id} value={topic.id}>
                                                            {topic.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="topic-concept-search">Concepts</Label>
                                                <Input
                                                    id="topic-concept-search"
                                                    value={topicConceptSearch}
                                                    onChange={(event) => setTopicConceptSearch(event.target.value)}
                                                    placeholder="Search bound concepts..."
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {!selectedCurriculum.topics.length ? (
                                    <div className="flex h-48 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                                        This curriculum has no topics yet.
                                    </div>
                                ) : !selectedCurriculum.boundConcepts.length ? (
                                    <div className="flex h-48 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                                        Bind concepts to this curriculum before placing them in topics.
                                    </div>
                                ) : selectedTopic ? (
                                    <div className="divide-y">
                                        {filteredTopicConcepts.length ? filteredTopicConcepts.map((concept) => {
                                            const checked = selectedTopic.conceptIds.includes(concept.id);

                                            return (
                                                <label
                                                    key={concept.id}
                                                    className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-muted/40"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={topicConceptMutation.isPending}
                                                        onChange={(event) => topicConceptMutation.mutate({
                                                            curriculumId: selectedCurriculum.id,
                                                            curriculumTopicId: selectedTopic.id,
                                                            conceptId: concept.id,
                                                            assigned: event.target.checked,
                                                        })}
                                                        className="mt-1 h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring/30"
                                                    />
                                                    <span className="min-w-0 space-y-1">
                                                        <span className="block truncate text-sm font-medium">
                                                            {conceptDisplayName(concept)}
                                                        </span>
                                                        <span className="block line-clamp-2 text-xs text-muted-foreground">
                                                            {conceptDescription(concept)}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        }) : (
                                            <div className="flex h-40 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                                                No bound concepts match your search.
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </section>
                        </div>
                    ) : null}
                </>
            ) : (
                <div className="flex h-48 items-center justify-center rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground shadow-sm">
                    No curriculums are available yet.
                </div>
            )}
        </div>
    );
}

function CurriculumConceptDialog({
    open,
    onOpenChange,
    state,
    concepts,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: BindingDialogState;
    concepts: AdminGlobalConcept[];
}) {
    const queryClient = useQueryClient();
    const boundConceptIds = new Set(state.curriculum.boundConcepts.map((concept) => concept.id));
    const availableConcepts = state.concept
        ? concepts.filter((concept) => concept.id === state.concept?.id)
        : concepts.filter((concept) => !boundConceptIds.has(concept.id));
    const [conceptId, setConceptId] = useState(state.concept ? String(state.concept.id) : "");
    const [localName, setLocalName] = useState(state.concept?.localName ?? "");
    const [localDescription, setLocalDescription] = useState(state.concept?.localDescription ?? "");

    const saveMutation = useMutation({
        mutationFn: () => adminBindCurriculumConcept({
            curriculumId: state.curriculum.id,
            conceptId: Number(conceptId),
            localName,
            localDescription,
        }),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "curriculums", "concept-bindings"]});
            toast.success(result.message);
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Unable to save the concept binding right now.");
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
                        <DialogTitle>{state.concept ? "Edit concept binding" : "Bind concept"}</DialogTitle>
                        <DialogDescription>
                            {state.curriculum.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="curriculum-binding-concept">Concept</Label>
                        <Select
                            id="curriculum-binding-concept"
                            value={conceptId}
                            onChange={(event) => setConceptId(event.target.value)}
                            disabled={Boolean(state.concept)}
                            required
                        >
                            <option value="" disabled>
                                Select a concept
                            </option>
                            {availableConcepts.map((concept) => (
                                <option key={concept.id} value={concept.id}>
                                    {concept.name}
                                </option>
                            ))}
                        </Select>
                        {!availableConcepts.length ? (
                            <p className="text-xs text-muted-foreground">
                                No unbound concepts are available.
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="curriculum-local-name">Local name (optional)</Label>
                        <Input
                            id="curriculum-local-name"
                            value={localName}
                            onChange={(event) => setLocalName(event.target.value)}
                            maxLength={255}
                            placeholder="Curriculum-specific name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="curriculum-local-description">Local description (optional)</Label>
                        <Textarea
                            id="curriculum-local-description"
                            value={localDescription}
                            onChange={(event) => setLocalDescription(event.target.value)}
                            maxLength={255}
                            placeholder="Curriculum-specific description"
                            className="min-h-24"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saveMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saveMutation.isPending || !conceptId || !availableConcepts.length}
                        >
                            {saveMutation.isPending
                                ? "Saving..."
                                : state.concept ? "Save binding" : "Bind concept"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

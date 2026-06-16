"use client";

import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {CheckCircle2} from "lucide-react";
import {toast} from "sonner";

import {
    adminMigrateQuestion,
    getAdminCurriculumBindings,
    getAdminPendingQuestions,
} from "@/app/actions/admin";
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

type CurriculumBindingsData = Awaited<ReturnType<typeof getAdminCurriculumBindings>>;
type AdminCurriculum = CurriculumBindingsData["curriculums"][number];
type PendingQuestion = Awaited<ReturnType<typeof getAdminPendingQuestions>>[number];

type MigrateQuestionDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    question: PendingQuestion;
    curriculums: AdminCurriculum[];
};

function conceptLabel(concept: AdminCurriculum["boundConcepts"][number]) {
    return concept.localName || concept.name;
}

export function MigrateQuestionDialog({
    open,
    onOpenChange,
    question,
    curriculums,
}: MigrateQuestionDialogProps) {
    const queryClient = useQueryClient();
    const [curriculumId, setCurriculumId] = useState("");
    const [selectedConceptIds, setSelectedConceptIds] = useState<number[]>([]);
    const [conceptSearch, setConceptSearch] = useState("");
    const [prompt, setPrompt] = useState(question.question);
    const [body, setBody] = useState(question.body ?? "");
    const [explanation, setExplanation] = useState(question.explanation ?? "");

    const selectedCurriculum = curriculums.find((item) => String(item.id) === curriculumId) ?? null;
    const availableConcepts = selectedCurriculum?.boundConcepts ?? [];

    // Picking a curriculum pre-selects whichever of the question's existing
    // concept tags are bound to it, then lets the admin adjust.
    function handleCurriculumChange(nextCurriculumId: string) {
        setCurriculumId(nextCurriculumId);
        setConceptSearch("");

        const nextCurriculum = curriculums.find((item) => String(item.id) === nextCurriculumId) ?? null;

        if (!nextCurriculum) {
            setSelectedConceptIds([]);
            return;
        }

        const boundIds = new Set(nextCurriculum.boundConcepts.map((concept) => concept.id));
        setSelectedConceptIds(question.concepts
            .map((concept) => concept.id)
            .filter((id) => boundIds.has(id)));
    }

    const migrateMutation = useMutation({
        mutationFn: () => adminMigrateQuestion({
            questionId: question.id,
            curriculumId: Number(curriculumId),
            conceptIds: selectedConceptIds,
            prompt,
            body,
            explanation,
        }),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "questions", "pending"]});
            toast.success(result.message);
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Unable to migrate the question right now.");
        },
    });

    function toggleConcept(conceptId: number) {
        setSelectedConceptIds((current) => current.includes(conceptId)
            ? current.filter((id) => id !== conceptId)
            : [...current, conceptId]);
    }

    const normalizedConceptSearch = conceptSearch.trim().toLowerCase();
    const filteredConcepts = availableConcepts.filter((concept) => (
        conceptLabel(concept).toLowerCase().includes(normalizedConceptSearch)
        || concept.name.toLowerCase().includes(normalizedConceptSearch)
    ));

    const canSubmit = Boolean(curriculumId)
        && prompt.trim().length > 0
        && selectedConceptIds.length > 0
        && !migrateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Migrate question</DialogTitle>
                    <DialogDescription>
                        Assign a curriculum and concepts to move this question into the live bank.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSubmit) {
                            migrateMutation.mutate();
                        }
                    }}
                    className="flex min-h-0 flex-1 flex-col gap-5"
                >
                    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="migrate-prompt">Question</Label>
                                <Input
                                    id="migrate-prompt"
                                    value={prompt}
                                    onChange={(event) => setPrompt(event.target.value)}
                                    maxLength={255}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="migrate-body">Body</Label>
                                <Textarea
                                    id="migrate-body"
                                    value={body}
                                    onChange={(event) => setBody(event.target.value)}
                                    maxLength={1024}
                                    rows={4}
                                    placeholder="Optional supporting context."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="migrate-explanation">Explanation</Label>
                                <Textarea
                                    id="migrate-explanation"
                                    value={explanation}
                                    onChange={(event) => setExplanation(event.target.value)}
                                    maxLength={255}
                                    rows={3}
                                    placeholder="Optional. Shown after answering."
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Answer choices</p>
                                <p className="text-xs text-muted-foreground">
                                    Options are carried over unchanged; edit them later from the questions list.
                                </p>
                                <div className="space-y-1.5">
                                    {question.options.map((option) => (
                                        <div
                                            key={option.id}
                                            className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm"
                                        >
                                            {option.isCorrect ? (
                                                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                                            ) : (
                                                <span className="size-4 shrink-0 rounded-full border border-input" />
                                            )}
                                            <span className="min-w-0 flex-1">{option.option}</span>
                                            {option.isCorrect ? (
                                                <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-primary">
                                                    correct
                                                </span>
                                            ) : null}
                                        </div>
                                    ))}
                                    {question.options.length === 0 ? (
                                        <p className="text-sm text-destructive">
                                            This question has no options and cannot be answered.
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="migrate-curriculum">Curriculum</Label>
                                <Select
                                    id="migrate-curriculum"
                                    value={curriculumId}
                                    onChange={(event) => handleCurriculumChange(event.target.value)}
                                    required
                                >
                                    <option value="" disabled>
                                        Select a curriculum
                                    </option>
                                    {curriculums.map((curriculumItem) => (
                                        <option key={curriculumItem.id} value={curriculumItem.id}>
                                            {curriculumItem.subjectName
                                                ? `${curriculumItem.subjectName} — ${curriculumItem.name}`
                                                : curriculumItem.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="migrate-concept-search">Concepts</Label>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedConceptIds.length} selected
                                    </span>
                                </div>
                                <Input
                                    id="migrate-concept-search"
                                    value={conceptSearch}
                                    onChange={(event) => setConceptSearch(event.target.value)}
                                    placeholder="Search bound concepts..."
                                    disabled={!selectedCurriculum}
                                />

                                {!selectedCurriculum ? (
                                    <p className="text-sm text-muted-foreground">
                                        Select a curriculum to choose its concepts.
                                    </p>
                                ) : filteredConcepts.length ? (
                                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                        {filteredConcepts.map((concept) => (
                                            <label
                                                key={concept.id}
                                                className="flex cursor-pointer items-center gap-3 rounded-md border border-border/70 px-3 py-2 transition-colors hover:bg-muted/40"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedConceptIds.includes(concept.id)}
                                                    onChange={() => toggleConcept(concept.id)}
                                                    className="h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring/30"
                                                />
                                                <span className="text-sm text-foreground">
                                                    {conceptLabel(concept)}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : availableConcepts.length ? (
                                    <p className="text-sm text-muted-foreground">
                                        No bound concepts match your search.
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        This curriculum has no bound concepts yet. Bind concepts to it first.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={migrateMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!canSubmit}>
                            {migrateMutation.isPending ? "Migrating..." : "Migrate question"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

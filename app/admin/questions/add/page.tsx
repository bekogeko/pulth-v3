"use client";

import {useDeferredValue, useMemo, useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import {adminCreateQuestion, getAdminCurriculumBindings} from "@/app/actions/admin";
import {getSimilarQuestions} from "@/app/(dashboard)/quiz/quiz";
import {SimilarQuestionsPanel} from "@/app/(dashboard)/quiz/SimilarQuestionsPanel";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Skeleton} from "@/components/ui/skeleton";
import {Textarea} from "@/components/ui/textarea";

type CurriculumBindingsData = Awaited<ReturnType<typeof getAdminCurriculumBindings>>;
type AdminCurriculum = CurriculumBindingsData["curriculums"][number];
type BoundConcept = AdminCurriculum["boundConcepts"][number];

const INITIAL_OPTIONS = ["", ""];
const SIMILARITY_MIN_QUERY_LENGTH = 8;
const HIGH_SIMILARITY_SCORE = 50;

function conceptLabel(concept: BoundConcept) {
    return concept.localName || concept.name;
}

export default function AdminAddQuestionPage() {
    const queryClient = useQueryClient();
    const promptRef = useRef<HTMLInputElement>(null);

    // Scope — intentionally kept selected between saves so an admin can author
    // many questions for the same curriculum/concepts without re-picking.
    const [curriculumId, setCurriculumId] = useState("");
    const [selectedConceptIds, setSelectedConceptIds] = useState<number[]>([]);
    const [conceptSearch, setConceptSearch] = useState("");

    // Per-question fields — cleared after each successful save.
    const [prompt, setPrompt] = useState("");
    const [body, setBody] = useState("");
    const [explanation, setExplanation] = useState("");
    const [options, setOptions] = useState<string[]>(INITIAL_OPTIONS);
    const [correctIndex, setCorrectIndex] = useState(0);

    const {data: bindings, isLoading: bindingsLoading} = useQuery({
        queryKey: ["admin", "curriculums", "concept-bindings"],
        queryFn: getAdminCurriculumBindings,
    });

    const curriculums = useMemo(() => bindings?.curriculums ?? [], [bindings?.curriculums]);
    const selectedCurriculum = curriculums.find((item) => String(item.id) === curriculumId) ?? null;
    const availableConcepts = selectedCurriculum?.boundConcepts ?? [];

    const deferredPrompt = useDeferredValue(prompt);
    const deferredBody = useDeferredValue(body);
    const deferredOptions = useDeferredValue(options);
    const similarQuestionInput = useMemo(() => ({
        prompt: deferredPrompt,
        body: deferredBody,
        options: deferredOptions,
    }), [deferredBody, deferredOptions, deferredPrompt]);

    const normalizedSimilaritySearch = [deferredPrompt, deferredBody, ...deferredOptions]
        .join(" ")
        .trim();
    const shouldCheckSimilarQuestions = normalizedSimilaritySearch.length >= SIMILARITY_MIN_QUERY_LENGTH;

    const {data: similarQuestions, isFetching: similarQuestionsFetching} = useQuery({
        queryKey: ["questions", "similar", similarQuestionInput],
        queryFn: () => getSimilarQuestions(similarQuestionInput),
        enabled: shouldCheckSimilarQuestions,
        staleTime: 30_000,
    });

    const highSimilarityQuestions = (similarQuestions ?? []).filter(
        (question) => question.score >= HIGH_SIMILARITY_SCORE,
    );

    const createMutation = useMutation({
        mutationFn: () => adminCreateQuestion({
            curriculumId: Number(curriculumId),
            conceptIds: selectedConceptIds,
            prompt,
            body,
            explanation,
            options,
            correctIndex,
        }),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            // Counts on the curriculum/topic pages are revalidated server-side; refresh
            // the admin bindings so any cached concept lists stay accurate.
            await queryClient.invalidateQueries({queryKey: ["admin", "curriculums", "concept-bindings"]});
            toast.success(result.message);

            // Clear only the per-question fields; keep curriculum + concepts for the
            // next entry and refocus the prompt.
            setPrompt("");
            setBody("");
            setExplanation("");
            setOptions(INITIAL_OPTIONS);
            setCorrectIndex(0);
            promptRef.current?.focus();
        },
        onError: () => {
            toast.error("Unable to create the question right now.");
        },
    });

    function handleCurriculumChange(nextCurriculumId: string) {
        setCurriculumId(nextCurriculumId);
        setConceptSearch("");

        const nextCurriculum = curriculums.find((item) => String(item.id) === nextCurriculumId) ?? null;

        // Keep only concepts that are also bound to the newly chosen curriculum.
        if (!nextCurriculum) {
            setSelectedConceptIds([]);
            return;
        }

        const boundIds = new Set(nextCurriculum.boundConcepts.map((concept) => concept.id));
        setSelectedConceptIds((current) => current.filter((id) => boundIds.has(id)));
    }

    function toggleConcept(conceptId: number) {
        setSelectedConceptIds((current) => current.includes(conceptId)
            ? current.filter((id) => id !== conceptId)
            : [...current, conceptId]);
    }

    function addOption() {
        setOptions((current) => [...current, ""]);
    }

    function updateOption(index: number, value: string) {
        setOptions((current) => {
            const next = [...current];
            next[index] = value;
            return next;
        });
    }

    function removeOption(index: number) {
        setOptions((current) => current.filter((_, currentIndex) => currentIndex !== index));
        setCorrectIndex((current) => {
            if (current === index) {
                return Math.max(0, index - 1);
            }

            if (current > index) {
                return current - 1;
            }

            return current;
        });
    }

    const trimmedOptions = options.map((option) => option.trim());
    const canSubmit = Boolean(curriculumId)
        && prompt.trim().length > 0
        && selectedConceptIds.length > 0
        && trimmedOptions.length >= 2
        && trimmedOptions.every((option) => option.length > 0)
        && !createMutation.isPending;

    function submit() {
        if (!canSubmit) {
            return;
        }

        if (highSimilarityQuestions.length > 0) {
            const confirmed = window.confirm(
                `${highSimilarityQuestions.length} question${highSimilarityQuestions.length === 1 ? "" : "s"} ` +
                "look at least 50% similar. Create this question anyway?",
            );

            if (!confirmed) {
                return;
            }
        }

        createMutation.mutate();
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submit();
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
        // Cmd/Ctrl+Enter saves from anywhere in the form for rapid entry.
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
        }
    }

    const normalizedConceptSearch = conceptSearch.trim().toLowerCase();
    const filteredConcepts = availableConcepts.filter((concept) => (
        conceptLabel(concept).toLowerCase().includes(normalizedConceptSearch)
        || concept.name.toLowerCase().includes(normalizedConceptSearch)
    ));

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold">Add questions</h2>
                <p className="text-sm text-muted-foreground">
                    Author curriculum-scoped questions in bulk. The curriculum and concepts stay
                    selected after each save so you can keep adding. Press ⌘/Ctrl+Enter to save.
                </p>
            </div>

            {bindingsLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-72 w-full rounded-xl" />
                </div>
            ) : curriculums.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground shadow-sm">
                    Create a curriculum and bind concepts to it before adding questions.
                </div>
            ) : (
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
                    <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="space-y-2">
                                <Label htmlFor="add-question-curriculum">Curriculum</Label>
                                <Select
                                    id="add-question-curriculum"
                                    value={curriculumId}
                                    onChange={(event) => handleCurriculumChange(event.target.value)}
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
                                <p className="text-xs text-muted-foreground">
                                    Stays selected between saves.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="add-question-concept-search">Concepts</Label>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedConceptIds.length} selected
                                    </span>
                                </div>
                                <Input
                                    id="add-question-concept-search"
                                    value={conceptSearch}
                                    onChange={(event) => setConceptSearch(event.target.value)}
                                    onKeyDown={(event) => {
                                        // Enter here filters concepts; don't let it submit the form.
                                        if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
                                            event.preventDefault();
                                        }
                                    }}
                                    placeholder="Search bound concepts..."
                                    disabled={!selectedCurriculum}
                                />

                                {!selectedCurriculum ? (
                                    <p className="text-sm text-muted-foreground">
                                        Select a curriculum to choose its concepts.
                                    </p>
                                ) : filteredConcepts.length ? (
                                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
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
                    </section>

                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span>{options.length} option{options.length === 1 ? "" : "s"}</span>
                        <span>{selectedConceptIds.length} concept{selectedConceptIds.length === 1 ? "" : "s"} linked</span>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                        <div className="space-y-6">
                            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                <div className="space-y-2">
                                    <Label htmlFor="add-question-prompt">Question</Label>
                                    <Input
                                        id="add-question-prompt"
                                        ref={promptRef}
                                        value={prompt}
                                        onChange={(event) => setPrompt(event.target.value)}
                                        placeholder="e.g. What is polymorphism?"
                                        maxLength={255}
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add-question-body">Body</Label>
                                    <Textarea
                                        id="add-question-body"
                                        value={body}
                                        onChange={(event) => setBody(event.target.value)}
                                        placeholder="Optional supporting context, snippet, or note."
                                        maxLength={1024}
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add-question-explanation">Explanation</Label>
                                    <Textarea
                                        id="add-question-explanation"
                                        value={explanation}
                                        onChange={(event) => setExplanation(event.target.value)}
                                        placeholder="Optional. Shown after answering."
                                        maxLength={255}
                                        rows={3}
                                    />
                                </div>
                            </section>

                            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium">Answer choices</p>
                                        <p className="text-xs text-muted-foreground">
                                            Choose one correct option before saving.
                                        </p>
                                    </div>
                                    <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                                        <Plus className="size-4" />
                                        Add option
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {options.map((option, index) => (
                                        <div key={`add-option-${index}`} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="add-question-correct"
                                                checked={correctIndex === index}
                                                onChange={() => setCorrectIndex(index)}
                                                aria-label={`Mark option ${index + 1} as correct`}
                                                className="h-4 w-4 border border-input text-primary focus:ring-2 focus:ring-ring/40"
                                            />
                                            <Input
                                                value={option}
                                                onChange={(event) => updateOption(index, event.target.value)}
                                                placeholder={`Option ${index + 1}`}
                                                maxLength={255}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={() => removeOption(index)}
                                                disabled={options.length <= 2}
                                                aria-label={`Remove option ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                <div>
                                    <p className="text-sm font-medium">Similar questions</p>
                                    <p className="text-xs text-muted-foreground">
                                        Checks the whole question bank as you type to catch duplicates.
                                    </p>
                                </div>
                                <SimilarQuestionsPanel
                                    enabled={shouldCheckSimilarQuestions}
                                    isFetching={similarQuestionsFetching}
                                    questions={similarQuestions ?? []}
                                />
                            </section>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            {selectedCurriculum
                                ? "Saving keeps this curriculum and concepts for the next question."
                                : "Select a curriculum and at least one concept to begin."}
                        </p>
                        <Button type="submit" disabled={!canSubmit}>
                            {createMutation.isPending ? "Saving..." : "Save & add another"}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}

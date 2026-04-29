"use client";

import {useDeferredValue, useEffect, useMemo, useRef, useState, useTransition} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft, Eye, Send, Save, XCircle} from "lucide-react";
import {toast} from "sonner";
import type EditorJS from "@editorjs/editorjs";
import type {ToolConstructable} from "@editorjs/editorjs";

import {
    publishArticleDraft,
    saveArticleDraft,
    unpublishArticle,
} from "@/app/actions/article";
import type {EditorJsOutput} from "@/schemas/EditorTypes";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

type ArticleForEdit = NonNullable<Awaited<ReturnType<typeof import("@/app/actions/article").getMyArticleForEdit>>>;

type ArticleEditorProps = {
    article: ArticleForEdit;
    concepts: {
        id: number;
        name: string;
    }[];
    topics: {
        id: number;
        title: string;
    }[];
};

export function ArticleEditor({article, concepts, topics}: ArticleEditorProps) {
    const router = useRouter();
    const editorRef = useRef<EditorJS | null>(null);
    const holderId = useMemo(() => `article-editor-${article.id}`, [article.id]);
    const [currentSlug, setCurrentSlug] = useState(article.slug);
    const [title, setTitle] = useState(article.title);
    const [description, setDescription] = useState(article.description);
    const [selectedConceptIds, setSelectedConceptIds] = useState(
        () => article.concepts.map((concept) => concept.id)
    );
    const [selectedTopicIds, setSelectedTopicIds] = useState(
        () => article.topics.map((topic) => topic.id)
    );
    const [isPublished, setIsPublished] = useState(article.isPublished);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let isMounted = true;

        async function mountEditor() {
            const [{default: Editor}, {default: Header}, {default: List}] = await Promise.all([
                import("@editorjs/editorjs"),
                import("@editorjs/header"),
                import("@editorjs/list"),
            ]);

            if (!isMounted || editorRef.current) {
                return;
            }

            editorRef.current = new Editor({
                holder: holderId,
                data: article.draftBody ?? article.body,
                autofocus: true,
                placeholder: "Write the article...",
                tools: {
                    header: {
                        class: Header as unknown as ToolConstructable,
                        config: {
                            levels: [2, 3, 4],
                            defaultLevel: 2,
                        },
                    },
                    list: {
                        class: List as unknown as ToolConstructable,
                        inlineToolbar: true,
                    },
                },
            });
        }

        void mountEditor();

        return () => {
            isMounted = false;
            const editor = editorRef.current;
            editorRef.current = null;

            if (editor && typeof editor.destroy === "function") {
                editor.destroy();
            }
        };
    }, [article.body, article.draftBody, holderId]);

    useEffect(() => {
        setCurrentSlug(article.slug);
    }, [article.slug]);

    function toggleConcept(conceptId: number) {
        setSelectedConceptIds((currentIds) => (
            currentIds.includes(conceptId)
                ? currentIds.filter((id) => id !== conceptId)
                : [...currentIds, conceptId]
        ));
    }

    function toggleTopic(topicId: number) {
        setSelectedTopicIds((currentIds) => (
            currentIds.includes(topicId)
                ? currentIds.filter((id) => id !== topicId)
                : [...currentIds, topicId]
        ));
    }

    async function readEditorBody(): Promise<EditorJsOutput> {
        if (!editorRef.current) {
            return article.draftBody ?? article.body;
        }

        return editorRef.current.save() as Promise<EditorJsOutput>;
    }

    function handleSaveDraft() {
        startTransition(async () => {
            const body = await readEditorBody();
            const result = await saveArticleDraft({
                slug: currentSlug,
                title,
                description,
                body,
                conceptIds: selectedConceptIds,
                topicIds: selectedTopicIds,
            });

            if (result.status === "success") {
                toast.success(result.message);
                if (result.slug && result.slug !== currentSlug) {
                    setCurrentSlug(result.slug);
                    router.replace(`/articles/${result.slug}/edit`);
                }
            } else {
                toast.error(result.message);
            }
        });
    }

    function handlePublishDraft() {
        startTransition(async () => {
            const body = await readEditorBody();
            const saveResult = await saveArticleDraft({
                slug: currentSlug,
                title,
                description,
                body,
                conceptIds: selectedConceptIds,
                topicIds: selectedTopicIds,
            });

            if (saveResult.status === "error") {
                toast.error(saveResult.message);
                return;
            }

            const slug = saveResult.slug ?? currentSlug;
            const publishResult = await publishArticleDraft(slug);

            if (publishResult.status === "success") {
                setIsPublished(true);
                if (slug !== currentSlug) {
                    setCurrentSlug(slug);
                    router.replace(`/articles/${slug}/edit`);
                }
                toast.success(publishResult.message);
            } else {
                toast.error(publishResult.message);
            }
        });
    }

    function handleUnpublish() {
        startTransition(async () => {
            const result = await unpublishArticle(currentSlug);

            if (result.status === "success") {
                setIsPublished(false);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        });
    }

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <Button asChild variant="ghost" className="w-fit px-0">
                        <Link href="/articles/self">
                            <ArrowLeft className="size-4"/>
                            My articles
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-lg font-semibold">Edit Article</h2>
                        <p className="text-sm text-muted-foreground">
                            {isPublished ? "Published" : "Draft"} article
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {isPublished ? (
                        <Button asChild variant="outline">
                            <Link href={`/articles/${currentSlug}`}>
                                <Eye className="size-4"/>
                                View
                            </Link>
                        </Button>
                    ) : null}
                    <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isPending}>
                        <Save className="size-4"/>
                        Save draft
                    </Button>
                    <Button type="button" onClick={handlePublishDraft} disabled={isPending}>
                        <Send className="size-4"/>
                        Publish draft
                    </Button>
                    {isPublished ? (
                        <Button type="button" variant="outline" onClick={handleUnpublish} disabled={isPending}>
                            <XCircle className="size-4"/>
                            Unpublish
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-w-0 space-y-4">
                    <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm">
                        <div className="space-y-2">
                            <Label htmlFor="article-title">Title</Label>
                            <Input
                                id="article-title"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                maxLength={255}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="article-description">Description</Label>
                            <Textarea
                                id="article-description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                className="min-h-24"
                            />
                        </div>
                    </div>

                    <div className="min-h-[32rem] rounded-xl border bg-card p-4 shadow-sm">
                        <div
                            id={holderId}
                            className="article-editor max-w-none"
                        />
                    </div>
                </div>

                <aside className="space-y-4">
                    <TaxonomySection
                        title="Concepts"
                        emptyLabel="No concepts available"
                        options={concepts.map((concept) => ({
                            id: concept.id,
                            label: concept.name,
                        }))}
                        selectedIds={selectedConceptIds}
                        onToggle={toggleConcept}
                    />
                    <TaxonomySection
                        title="Topics"
                        emptyLabel="No topics available"
                        options={topics.map((topic) => ({
                            id: topic.id,
                            label: topic.title,
                        }))}
                        selectedIds={selectedTopicIds}
                        onToggle={toggleTopic}
                    />
                </aside>
            </div>
        </div>
    );
}

function TaxonomySection({
    title,
    emptyLabel,
    options,
    selectedIds,
    onToggle,
}: {
    title: string;
    emptyLabel: string;
    options: {
        id: number;
        label: string;
    }[];
    selectedIds: number[];
    onToggle: (id: number) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
    const filteredOptions = useMemo(() => (
        normalizedSearchQuery
            ? options.filter((option) => option.label.toLowerCase().includes(normalizedSearchQuery))
            : options
    ), [normalizedSearchQuery, options]);

    return (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="text-xs text-muted-foreground">
                    {selectedIds.length} selected
                </p>
            </div>
            <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                aria-label={`Search ${title.toLowerCase()}`}
                className="mt-3"
                disabled={!options.length}
            />
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {filteredOptions.length ? filteredOptions.map((option) => {
                    const inputId = `${title.toLowerCase()}-${option.id}`;

                    return (
                        <label
                            key={option.id}
                            htmlFor={inputId}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                        >
                            <input
                                id={inputId}
                                type="checkbox"
                                className="size-4"
                                checked={selectedIds.includes(option.id)}
                                onChange={() => onToggle(option.id)}
                            />
                            <span>{option.label}</span>
                        </label>
                    );
                }) : options.length ? (
                    <p className="text-sm text-muted-foreground">
                        No {title.toLowerCase()} match your search.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">{emptyLabel}</p>
                )}
            </div>
        </section>
    );
}

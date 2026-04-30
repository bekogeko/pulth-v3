import type {ReactNode} from "react";
import Link from "next/link";
import {ArrowRight, BookOpenText, Sparkles} from "lucide-react";

import InlineRenderer from "@/app/(dashboard)/articles/[slug]/InlineRenderer";
import ListRenderer from "@/app/(dashboard)/articles/[slug]/ListRenderer";
import {Button} from "@/components/ui/button";
import type {Block, EditorJsOutput, EditorListItem} from "@/schemas/EditorTypes";

type ArticleConcept = {
    id: number;
    name: string;
    slug: string;
};

type ArticleTopic = {
    id: number;
    title: string;
    slug: string;
};

function Header(props: { level: number; children: ReactNode }) {
    switch (props.level) {
        case 1:
            return <h1 className="mt-10 text-4xl font-semibold tracking-normal">{props.children}</h1>;
        case 2:
            return <h2 className="mt-9 text-3xl font-semibold tracking-normal">{props.children}</h2>;
        case 3:
            return <h3 className="mt-8 text-2xl font-semibold tracking-normal">{props.children}</h3>;
        case 4:
            return <h4 className="mt-7 text-xl font-semibold tracking-normal">{props.children}</h4>;
        case 5:
            return <h5 className="mt-6 text-lg font-semibold tracking-normal">{props.children}</h5>;
        case 6:
            return <h6 className="mt-5 text-base font-semibold tracking-normal">{props.children}</h6>;
        default:
            return <div>{props.children}</div>;
    }
}

function renderBlock(item: Block, index: number) {
    const key = item.id ?? `${item.type}-${index}`;
    const text = typeof item.data.text === "string" ? item.data.text : "";

    switch (item.type) {
        case "header":
            return (
                <Header key={key} level={typeof item.data.level === "number" ? item.data.level : 2}>
                    <InlineRenderer text={text}/>
                </Header>
            );
        case "paragraph":
            return (
                <p key={key} className="my-5 leading-8 text-foreground/90">
                    <InlineRenderer text={text}/>
                </p>
            );
        case "list":
            const items = Array.isArray(item.data.items) ? item.data.items as EditorListItem[] : [];

            return (
                <div key={key} className="my-5 leading-8 text-foreground/90">
                    <ListRenderer
                        style={typeof item.data.style === "string" ? item.data.style : "unordered"}
                        items={items}
                        meta={typeof item.data.meta === "object" && item.data.meta !== null ? item.data.meta as Record<string, unknown> : undefined}
                    />
                </div>
            );
        case "code":
            const code = typeof item.data.code === "string" ? item.data.code : "";

            return (
                <pre key={key} className="my-5 overflow-x-auto rounded-md bg-muted p-4 text-sm leading-6 text-foreground">
                    <code>{code}</code>
                </pre>
            );
        default:
            return (
                <pre className="my-5 overflow-x-auto rounded-md bg-destructive/10 p-4 text-sm text-destructive" key={key}>
                    Error unknown type: {JSON.stringify(item, null, 2)}
                </pre>
            );
    }
}

function RelatedQuizLinks(props: {
    concepts: ArticleConcept[];
    topics: ArticleTopic[];
}) {
    if (!props.concepts.length && !props.topics.length) {
        return null;
    }

    return (
        <aside className="mt-12 rounded-lg border border-border bg-card p-5 text-card-foreground">
            <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold tracking-normal">Practice this article</h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Use the related quiz paths below to solve questions connected to this article.
                        </p>
                    </div>

                    {props.concepts.length > 0 ? (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Concepts
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {props.concepts.map((concept) => (
                                    <Button key={concept.id} asChild size="sm">
                                        <Link href={`/quiz/concepts/${concept.slug}/solve`} prefetch={false}>
                                            <Sparkles />
                                            {concept.name}
                                        </Link>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {props.topics.length > 0 ? (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Topics
                            </h3>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {props.topics.map((topic) => (
                                    <Link
                                        key={topic.id}
                                        href={`/quiz?topic=${encodeURIComponent(topic.slug)}`}
                                        className="group flex items-center justify-between gap-3 rounded-md border border-border/80 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <BookOpenText className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                                            <span className="truncate">{topic.title}</span>
                                        </span>
                                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                    </Link>
                                ))}
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">
                                Topic links open the selected quiz topic so you can choose a concept to solve.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </aside>
    );
}

export default function ArticleRenderer(props: {
    title: string;
    description: string;
    body: EditorJsOutput;
    concepts: ArticleConcept[];
    topics: ArticleTopic[];
}) {
    return (
        <article className="mx-auto max-w-2xl px-4 py-12">
            <header className="mb-10 border-b pb-8 text-center">
                <h1 className="text-4xl font-semibold tracking-normal">{props.title}</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground">{props.description}</p>
            </header>

            <div>
                {props.body.blocks.map(renderBlock)}
            </div>

            <RelatedQuizLinks concepts={props.concepts} topics={props.topics} />
        </article>
    );
}

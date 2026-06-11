import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, Sparkles} from "lucide-react";

import {getAllTopicsWithConcepts, getTopicWithConceptsBySlug} from "@/app/(dashboard)/quiz/quiz";
import {Button} from "@/components/ui/button";
import {getAbsoluteUrl} from "@/lib/site-url";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
    const topics = await getAllTopicsWithConcepts();
    return topics.map(({slug}) => ({topic: slug}));
}

type TopicPageProps = {
    params: Promise<{ topic: string }>;
};

type TopicWithConcepts = Awaited<ReturnType<typeof getTopicWithConceptsBySlug>>[number];

function countQuestions(topic: TopicWithConcepts) {
    return topic.concepts.reduce((total, concept) => total + Number(concept.questionCount), 0);
}

function createDescription(topic: TopicWithConcepts) {
    const conceptCount = topic.concepts.length;
    const questionCount = countQuestions(topic);
    const prefix = questionCount > 0
        ? `Practice ${questionCount} ${questionCount === 1 ? "question" : "questions"} across ${conceptCount} ${conceptCount === 1 ? "concept" : "concepts"} for ${topic.title}.`
        : `Practice ${topic.title} one concept at a time.`;
    const body = topic.description?.trim();
    const value = body ? `${prefix} ${body}` : prefix;

    return value.length > 160 ? `${value.slice(0, 157).trimEnd()}...` : value;
}

function createTopicJsonLd(topic: TopicWithConcepts) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${topic.title} practice concepts`,
        description: topic.description || `Practice concepts for ${topic.title}.`,
        url: getAbsoluteUrl(`/quiz/${topic.slug}`),
        numberOfItems: topic.concepts.length,
        itemListElement: topic.concepts.map((concept, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: concept.name,
            url: getAbsoluteUrl(`/quiz/concepts/${concept.slug}/solve`),
        })),
    };
}

export async function generateMetadata({params}: TopicPageProps): Promise<Metadata> {
    const {topic: topicSlug} = await params;
    const topic = await getTopicWithConceptsBySlug(topicSlug).then((results) => results[0]);

    if (!topic) {
        notFound();
    }

    const url = getAbsoluteUrl(`/quiz/${topic.slug}`);
    const title = `${topic.title} Quiz Practice | Pulth`;
    const description = createDescription(topic);

    return {
        title,
        description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title,
            description,
            url,
            siteName: "Pulth",
            type: "website",
        },
        twitter: {
            card: "summary",
            title,
            description,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function TopicPage({params}: TopicPageProps) {
    const {topic: topicSlug} = await params;
    const topic = await getTopicWithConceptsBySlug(topicSlug).then((results) => results[0]);

    if (!topic) {
        notFound();
    }

    const conceptCount = topic.concepts.length;
    const questionCount = countQuestions(topic);

    return (
        <div className="flex flex-col gap-6 p-6">
            <script
                type="application/ld+json"
                suppressHydrationWarning
                dangerouslySetInnerHTML={{__html: JSON.stringify(createTopicJsonLd(topic))}}
            />

            <header className="border-b border-border pb-5">
                <div className="max-w-2xl space-y-3">
                    <Link
                        href="/quiz"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        All topics
                    </Link>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            Topic practice
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {topic.title} Quiz Practice
                        </h1>
                        <p className="text-sm leading-6 text-muted-foreground">
                            {topic.description}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="rounded-full bg-muted px-3 py-1">
                            {conceptCount} concept{conceptCount === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1">
                            {questionCount} question{questionCount === 1 ? "" : "s"}
                        </span>
                    </div>
                </div>
            </header>

            <section className="space-y-3" aria-labelledby="topic-concepts-heading">
                <div className="space-y-1">
                    <h2 id="topic-concepts-heading" className="text-lg font-semibold">Concepts</h2>
                    <p className="text-sm text-muted-foreground">
                        Solve questions for one concept at a time.
                    </p>
                </div>

                {topic.concepts.length ? (
                    <div className="space-y-2">
                        {topic.concepts.map((concept) => {
                            const conceptQuestionCount = Number(concept.questionCount);

                            return (
                                <div
                                    key={concept.id}
                                    className="grid gap-3 rounded-lg border border-border/70 bg-background px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-center"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <p className="truncate font-medium leading-6">{concept.name}</p>
                                        <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                                            {concept.description || "No description provided."}
                                        </p>
                                    </div>
                                    <div className="text-sm text-muted-foreground sm:text-right">
                                        <span className="font-medium text-foreground">{conceptQuestionCount}</span>
                                        {" "}question{conceptQuestionCount === 1 ? "" : "s"}
                                    </div>
                                    {conceptQuestionCount > 0 ? (
                                        <Button asChild size="sm" className="shrink-0">
                                            <Link href={`/quiz/concepts/${concept.slug}/solve`} prefetch={false}>
                                                <Sparkles />
                                                Solve
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button size="sm" className="shrink-0" disabled>
                                            <Sparkles />
                                            Solve
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-lg border border-dashed border-border/80 px-4 py-3 text-sm text-muted-foreground">
                        No concepts attached to this topic yet.
                    </p>
                )}
            </section>
        </div>
    );
}

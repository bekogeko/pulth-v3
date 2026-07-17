import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Globe, Sparkles} from "lucide-react";

import {
    getCurriculumTopicDetail,
    getCurriculumTopicSlugs,
} from "@/app/actions/subject";
import {AddQuestionButton} from "@/app/(dashboard)/[subjectSlug]/[curriculumSlug]/[topicSlug]/add-question-dialog";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {Button} from "@/components/ui/button";

export const revalidate = false;
export const dynamicParams = true;

type CurriculumTopicPageProps = {
    params: Promise<{
        subjectSlug: string;
        curriculumSlug: string;
        topicSlug: string;
    }>;
};

export async function generateStaticParams() {
    const topics = await getCurriculumTopicSlugs();

    return topics.map((topic) => ({
        subjectSlug: topic.subjectSlug,
        curriculumSlug: topic.curriculumSlug,
        topicSlug: topic.topicSlug,
    }));
}

export async function generateMetadata({params}: CurriculumTopicPageProps): Promise<Metadata> {
    const {subjectSlug, curriculumSlug, topicSlug} = await params;
    const topic = await getCurriculumTopicDetail(subjectSlug, curriculumSlug, topicSlug);

    if (!topic) {
        return {
            title: "Topic not found",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    return {
        title: `${topic.topicName} | ${topic.name} | Pulth`,
        description: topic.topicDescription,
    };
}

export default async function CurriculumTopicPage({params}: CurriculumTopicPageProps) {
    const {subjectSlug, curriculumSlug, topicSlug} = await params;
    const topic = await getCurriculumTopicDetail(subjectSlug, curriculumSlug, topicSlug);

    if (!topic) {
        notFound();
    }

    const conceptCount = topic.concepts.length;
    const curriculumQuestionCount = topic.concepts.reduce(
        (total, concept) => total + concept.curriculumQuestionCount,
        0,
    );
    const globalQuestionCount = topic.concepts.reduce(
        (total, concept) => total + concept.questionCount,
        0,
    );
    const stats = [
        {label: "Concepts", value: conceptCount},
        {label: "Questions", value: curriculumQuestionCount},
        {label: "Global", value: globalQuestionCount},
    ];

    return (
        <main className="min-h-dvh bg-background text-foreground">
            <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                <header className="mb-10 space-y-6 border-b border-border pb-8">
                    <div className="space-y-3">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/subjects">Subjects</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href={`/${topic.subjectSlug}`}>
                                            {topic.subjectName}
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href={`/${topic.subjectSlug}/${topic.slug}`}>
                                            {topic.name}
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{topic.topicName}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <h1 className="text-3xl font-semibold tracking-normal text-balance sm:text-4xl">
                            {topic.topicName}
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            {topic.topicDescription}
                        </p>
                    </div>

                    <dl className="grid grid-cols-3 gap-3 sm:max-w-md">
                        {stats.map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-lg border border-border bg-background p-4 shadow-sm"
                            >
                                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    {stat.label}
                                </dt>
                                <dd className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</dd>
                            </div>
                        ))}
                    </dl>

                    {curriculumQuestionCount > 0 ? (
                        <Button asChild className="w-full sm:w-auto">
                            <Link href={`/quiz/topics/${topic.topicSlug}/solve`} prefetch={false}>
                                <Sparkles />
                                Solve questions
                            </Link>
                        </Button>
                    ) : (
                        <Button className="w-full sm:w-auto" disabled>
                            <Sparkles />
                            Solve questions
                        </Button>
                    )}
                </header>

                <section className="space-y-4" aria-labelledby="curriculum-topic-concepts-heading">
                    <div className="space-y-1">
                        <h2 id="curriculum-topic-concepts-heading" className="text-2xl font-semibold tracking-normal">
                            Concepts
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Concepts mapped to this topic — practice each one on its own.
                        </p>
                    </div>

                    {topic.concepts.length > 0 ? (
                        <ol className="space-y-3">
                            {topic.concepts.map((concept, index) => {
                                const displayName = concept.localName || concept.name;
                                const displayDescription = concept.localDescription
                                    || concept.description
                                    || "No description provided.";

                                return (
                                    <li
                                        key={concept.id}
                                        className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:p-6"
                                    >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <h3 className="min-w-0 text-lg font-semibold leading-snug text-balance">
                                                    {displayName}
                                                </h3>
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
                                            <p className="text-sm leading-6 text-muted-foreground">
                                                {displayDescription}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {concept.curriculumQuestionCount} in this curriculum
                                                {" · "}
                                                {concept.questionCount} global
                                            </p>
                                        </div>
                                        <div className="flex w-full flex-col gap-2 sm:w-auto">
                                            {concept.curriculumQuestionCount > 0 ? (
                                                <Button asChild size="sm" className="w-full sm:w-auto">
                                                    <Link
                                                        href={`/quiz/concepts/${concept.slug}/solve?curriculum=${topic.id}`}
                                                        prefetch={false}
                                                    >
                                                        <Sparkles />
                                                        Practice
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button size="sm" className="w-full sm:w-auto" disabled>
                                                    <Sparkles />
                                                    Practice
                                                </Button>
                                            )}
                                            {concept.questionCount > 0 ? (
                                                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                                                    <Link href={`/quiz/concepts/${concept.slug}/solve`} prefetch={false}>
                                                        <Globe />
                                                        Practice Global Concept
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" className="w-full sm:w-auto" disabled>
                                                    <Globe />
                                                    Practice Global Concept
                                                </Button>
                                            )}
                                            <AddQuestionButton
                                                curriculumId={topic.id}
                                                conceptId={concept.id}
                                                conceptName={displayName}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
                            <h3 className="text-base font-semibold">No concepts yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Concepts for this topic will appear here once they are mapped in the curriculum.
                            </p>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

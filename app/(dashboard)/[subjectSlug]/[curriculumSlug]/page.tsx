import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowRight} from "lucide-react";

import {getCurriculumDetail, getCurriculumSlugs} from "@/app/actions/subject";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const revalidate = false;
export const dynamicParams = true;

type CurriculumPageProps = {
    params: Promise<{
        subjectSlug: string;
        curriculumSlug: string;
    }>;
};

export async function generateStaticParams() {
    const curriculums = await getCurriculumSlugs();

    return curriculums.map((item) => ({
        subjectSlug: item.subjectSlug,
        curriculumSlug: item.curriculumSlug,
    }));
}

export async function generateMetadata({params}: CurriculumPageProps): Promise<Metadata> {
    const {subjectSlug, curriculumSlug} = await params;
    const curriculum = await getCurriculumDetail(subjectSlug, curriculumSlug);

    if (!curriculum) {
        return {
            title: "Curriculum not found",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    return {
        title: `${curriculum.name} | ${curriculum.subjectName} | Pulth`,
        description: `Topics covered in the ${curriculum.name} curriculum on Pulth.`,
    };
}

export default async function CurriculumPage({params}: CurriculumPageProps) {
    const {subjectSlug, curriculumSlug} = await params;
    const curriculum = await getCurriculumDetail(subjectSlug, curriculumSlug);

    if (!curriculum) {
        notFound();
    }

    const conceptCount = curriculum.topics.reduce((total, topic) => total + topic.conceptCount, 0);
    const stats = [
        {label: "Topics", value: curriculum.topics.length},
        {label: "Concepts", value: conceptCount},
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
                                        <Link href={`/${curriculum.subjectSlug}`}>
                                            {curriculum.subjectName}
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{curriculum.name}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <h1 className="text-3xl font-semibold tracking-normal text-balance sm:text-4xl">
                            {curriculum.name}
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Follow the topics below in order — each one maps the concepts you can
                            practice.
                        </p>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 sm:max-w-xs">
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
                </header>

                <section className="space-y-4" aria-labelledby="curriculum-topics-heading">
                    <div className="space-y-1">
                        <h2 id="curriculum-topics-heading" className="text-2xl font-semibold tracking-normal">
                            Topics
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                            The learning path for this curriculum, from first topic to last.
                        </p>
                    </div>

                    {curriculum.topics.length > 0 ? (
                        <ol className="space-y-3">
                            {curriculum.topics.map((topic, index) => (
                                <li key={topic.id}>
                                    <Link
                                        href={`/${curriculum.subjectSlug}/${curriculum.slug}/${topic.slug}`}
                                        className="group flex gap-4 rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 sm:p-6"
                                    >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="min-w-0 text-lg font-semibold leading-snug text-balance group-hover:text-primary">
                                                    {topic.name}
                                                </h3>
                                                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                    {topic.conceptCount} concept{topic.conceptCount === 1 ? "" : "s"}
                                                </span>
                                            </div>
                                            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                                {topic.description}
                                            </p>
                                        </div>
                                        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
                            <h3 className="text-base font-semibold">No topics yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Topics for this curriculum will appear here once they are created.
                            </p>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

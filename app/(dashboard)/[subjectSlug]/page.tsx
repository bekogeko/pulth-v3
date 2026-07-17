import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowRight, FolderTree} from "lucide-react";

import {getSubjectSlugs, getSubjectWithCurriculums} from "@/app/actions/subject";
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

type SubjectPageProps = {
    params: Promise<{
        subjectSlug: string;
    }>;
};

export async function generateStaticParams() {
    const subjects = await getSubjectSlugs();

    return subjects.map((subject) => ({
        subjectSlug: subject.slug,
    }));
}

export async function generateMetadata({params}: SubjectPageProps): Promise<Metadata> {
    const {subjectSlug} = await params;
    const subject = await getSubjectWithCurriculums(subjectSlug);

    if (!subject) {
        return {
            title: "Subject not found",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    return {
        title: `${subject.name} | Pulth`,
        description: `Explore the curriculums available for ${subject.name} on Pulth.`,
    };
}

export default async function SubjectPage({params}: SubjectPageProps) {
    const {subjectSlug} = await params;
    const subject = await getSubjectWithCurriculums(subjectSlug);

    if (!subject) {
        notFound();
    }

    const topicCount = subject.curriculums.reduce((total, item) => total + item.topicCount, 0);
    const stats = [
        {label: "Curriculums", value: subject.curriculums.length},
        {label: "Topics", value: topicCount},
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
                                    <BreadcrumbPage>{subject.name}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <h1 className="text-3xl font-semibold tracking-normal text-balance sm:text-4xl">
                            {subject.name}
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Pick a curriculum and work through its topics in order.
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

                <section className="space-y-4" aria-labelledby="subject-curriculums-heading">
                    <div className="space-y-1">
                        <h2 id="subject-curriculums-heading" className="text-2xl font-semibold tracking-normal">
                            Curriculums
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Each curriculum organizes {subject.name} into a sequence of topics.
                        </p>
                    </div>

                    {subject.curriculums.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {subject.curriculums.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/${subject.slug}/${item.slug}`}
                                    className="group flex flex-col justify-between gap-6 rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                <FolderTree className="size-4" />
                                            </span>
                                            <h3 className="text-lg font-semibold leading-snug text-balance group-hover:text-primary">
                                                {item.name}
                                            </h3>
                                        </div>
                                        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                            {item.topicCount} topic{item.topicCount === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                                        View topics
                                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
                            <h3 className="text-base font-semibold">No curriculums yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Curriculums for this subject will appear here once they are created.
                            </p>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight, LibraryBig} from "lucide-react";

import {getSubjectsWithCurriculums} from "@/app/actions/subject";

export const revalidate = false;

export const metadata: Metadata = {
    title: "Subjects | Pulth",
    description: "Browse subjects on Pulth and explore the curriculums within each one.",
};

export default async function SubjectsPage() {
    const subjects = await getSubjectsWithCurriculums();

    const curriculumCount = subjects.reduce(
        (total, subject) => total + subject.curriculums.length,
        0,
    );
    const stats = [
        {label: "Subjects", value: subjects.length},
        {label: "Curriculums", value: curriculumCount},
    ];

    return (
        <main className="min-h-dvh bg-background text-foreground">
            <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                <header className="mb-10 space-y-6 border-b border-border pb-8">
                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                            Browse
                        </p>
                        <h1 className="text-3xl font-semibold tracking-normal text-balance sm:text-4xl">
                            Subjects
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Every subject on Pulth, with the curriculums you can follow inside each
                            one.
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

                {subjects.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {subjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
                            >
                                <Link
                                    href={`/${subject.slug}`}
                                    className="group flex items-center justify-between gap-3"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <LibraryBig className="size-4" />
                                        </span>
                                        <h2 className="truncate text-lg font-semibold leading-snug group-hover:text-primary">
                                            {subject.name}
                                        </h2>
                                    </div>
                                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                </Link>

                                {subject.curriculums.length > 0 ? (
                                    <ul className="mt-4 space-y-1 border-t border-border pt-4">
                                        {subject.curriculums.map((item) => (
                                            <li key={item.id}>
                                                <Link
                                                    href={`/${subject.slug}/${item.slug}`}
                                                    className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                                                >
                                                    <span className="truncate">{item.name}</span>
                                                    <ArrowRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                                        No curriculums yet.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
                        <h2 className="text-base font-semibold">No subjects yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Subjects will appear here once they are created.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}

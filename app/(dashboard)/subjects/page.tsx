import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight, Library} from "lucide-react";

import {getSubjects} from "@/app/actions/subject";
import {Button} from "@/components/ui/button";

export const revalidate = false;

export const metadata: Metadata = {
    title: "Subjects | Pulth",
    description: "Browse subjects on Pulth and explore the curriculums within each one.",
};

export default async function SubjectsPage() {
    const subjects = await getSubjects();

    return (
        <main className="min-h-dvh bg-background text-foreground">
            <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Library className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-normal">Subjects</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                Browse subjects and explore the curriculums within each one.
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/">Home</Link>
                    </Button>
                </div>

                {subjects.length > 0 ? (
                    <div className="divide-y divide-border rounded-lg border border-border bg-card">
                        {subjects.map((subject) => (
                            <div key={subject.id} className="p-5 transition-colors hover:bg-muted/40 sm:p-6">
                                <Link href={`/${subject.slug}`} className="group block">
                                    <div className="flex items-center justify-between gap-4">
                                        <h2 className="text-xl font-semibold leading-snug group-hover:text-primary">
                                            {subject.name}
                                        </h2>
                                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                    </div>
                                </Link>
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

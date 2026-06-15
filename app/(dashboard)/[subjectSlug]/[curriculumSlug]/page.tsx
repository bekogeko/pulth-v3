import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {FolderTree} from "lucide-react";

import {getCurriculumDetail, getCurriculumSlugs} from "@/app/actions/subject";
import {Button} from "@/components/ui/button";

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

    return (
        <main className="min-h-dvh bg-background text-foreground">
            <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FolderTree className="size-5" />
                        </div>
                        <div>
                            <Link
                                href={`/${curriculum.subjectSlug}`}
                                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                            >
                                {curriculum.subjectName}
                            </Link>
                            <h1 className="text-3xl font-semibold tracking-normal">{curriculum.name}</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                Topics covered in this curriculum.
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="lg">
                        <Link href={`/${curriculum.subjectSlug}`}>Back to {curriculum.subjectName}</Link>
                    </Button>
                </div>

                {curriculum.topics.length > 0 ? (
                    <ol className="divide-y divide-border rounded-lg border border-border bg-card">
                        {curriculum.topics.map((topic, index) => (
                            <li key={topic.id} className="flex gap-4 p-5 sm:p-6">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                    {index + 1}
                                </span>
                                <div className="min-w-0 space-y-1">
                                    <h2 className="text-lg font-semibold leading-snug">{topic.name}</h2>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        {topic.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
                        <h2 className="text-base font-semibold">No topics yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Topics for this curriculum will appear here once they are created.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}

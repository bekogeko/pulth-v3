"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {SearchX} from "lucide-react";

import {Button} from "@/components/ui/button";

export default function CurriculumNotFound() {
    // not-found.tsx receives no params, but the subject slug is the first path segment
    // of /[subjectSlug]/[curriculumSlug], so we can offer a link back to the subject.
    const pathname = usePathname();
    const subjectSlug = pathname.split("/").filter(Boolean)[0];

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <SearchX className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    404
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">Curriculum not found</h1>
                <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                    We couldn&apos;t find a curriculum at this address. It may have been renamed or removed.
                </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                {subjectSlug ? (
                    <Button asChild>
                        <Link href={`/${subjectSlug}`}>Back to subject</Link>
                    </Button>
                ) : null}
                <Button asChild variant={subjectSlug ? "outline" : "default"}>
                    <Link href="/subjects">All subjects</Link>
                </Button>
            </div>
        </div>
    );
}

import type {ReactNode} from "react";
import {notFound, permanentRedirect} from "next/navigation";

import {getConceptByIdentifier} from "@/app/(dashboard)/quiz/quiz";

type SolveConceptLayoutProps = {
    children: ReactNode;
    params: Promise<{ concept: string }>;
};

// Gate the concept lookup here, above the segment's loading.tsx Suspense boundary.
// Once that boundary streams, the response headers (200) are already flushed and a
// notFound()/permanentRedirect() in page.tsx can only soft-404. Resolving the concept
// in the layout runs before streaming starts, so an invalid slug yields a real 404.
export default async function SolveConceptLayout({children, params}: SolveConceptLayoutProps) {
    const {concept: conceptParam} = await params;
    const concept = await getConceptByIdentifier(conceptParam).then((results) => results[0]);

    if (!concept) {
        notFound();
    }

    if (conceptParam !== concept.slug) {
        permanentRedirect(`/quiz/concepts/${concept.slug}/solve`);
    }

    return children;
}

admin panel for curriculumTopic. Should be able to add Topics to existing curriculums. Should be able to attach concepts in curriculumTopic_concepts.
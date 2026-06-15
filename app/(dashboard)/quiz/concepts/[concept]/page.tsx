import {notFound, permanentRedirect} from "next/navigation";

import {getConceptByIdentifier} from "@/app/(dashboard)/quiz/quiz";

export const revalidate = false;
export const dynamicParams = true;

type ConceptPageProps = {
    params: Promise<{ concept: string }>;
};

// The concept itself has no standalone view — solving is the only destination. A valid
// slug redirects to its /solve page; an unknown slug throws notFound() (caught by the
// styled concepts/not-found.tsx). There is no loading.tsx in this segment, so the
// response is not streamed and notFound() can set a real 404 status.
export default async function ConceptPage({params}: ConceptPageProps) {
    const {concept: conceptParam} = await params;
    const concept = await getConceptByIdentifier(conceptParam).then((results) => results[0]);

    if (!concept) {
        notFound();
    }

    permanentRedirect(`/quiz/concepts/${concept.slug}/solve`);
}

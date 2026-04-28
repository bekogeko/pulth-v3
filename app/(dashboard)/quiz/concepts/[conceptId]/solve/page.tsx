import {dehydrate, HydrationBoundary, QueryClient} from "@tanstack/react-query";
import {notFound, permanentRedirect} from "next/navigation";

import {QuizSolver} from "@/app/(dashboard)/quiz/[slug]/solve/QuizSolver";
import {getConceptByIdentifier, getQuestionsByConceptId, getQuizBySlug} from "@/app/(dashboard)/quiz/quiz";
import {Metadata} from "next";


export async function generateMetadata(
    { params }: {params:Promise<{ conceptId: string }>}): Promise<Metadata> {
    // read route params
    const { conceptId } = await params
    
    // fetch data
    const concept = await getConceptByIdentifier(conceptId).then((result)=>result[0]);

    return {
        title: concept.name,
        description: concept.description,
    }
}

export default async function SolveConceptPage({params}: {
    params: Promise<{ conceptId: string }>
}) {
    const {conceptId: conceptIdParam} = await params;
    const concept = await getConceptByIdentifier(conceptIdParam).then((results) => results[0]);

    if (!concept) {
        notFound();
    }

    if (conceptIdParam !== concept.slug) {
        permanentRedirect(`/quiz/concepts/${concept.slug}/solve`);
    }

    const conceptId = concept.id;
    const queryClient = new QueryClient();

    await Promise.allSettled([
        queryClient.prefetchQuery({
            queryKey: ["concept", conceptId],
            queryFn: () => [concept],
        }),
        queryClient.prefetchQuery({
            queryKey: ["concept", conceptId, "questions"],
            queryFn: () => getQuestionsByConceptId(conceptId),
        }),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="px-4 py-6 md:px-6">
                <QuizSolver key={conceptId} conceptId={conceptId} />
            </div>
        </HydrationBoundary>
    );
}

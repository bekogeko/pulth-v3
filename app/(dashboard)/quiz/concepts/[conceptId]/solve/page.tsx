import {dehydrate, HydrationBoundary, QueryClient} from "@tanstack/react-query";

import {QuizSolver} from "@/app/(dashboard)/quiz/[slug]/solve/QuizSolver";
import {getConceptById, getQuestionsByConceptId} from "@/app/(dashboard)/quiz/quiz";

export default async function SolveConceptPage({params}: {
    params: Promise<{ conceptId: string }>
}) {
    const {conceptId: conceptIdParam} = await params;
    const conceptId = Number.parseInt(conceptIdParam, 10);
    const queryClient = new QueryClient();

    await Promise.allSettled([
        queryClient.prefetchQuery({
            queryKey: ["concept", conceptId],
            queryFn: () => getConceptById(conceptId),
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

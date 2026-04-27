
import {getQuestionsBySlug, getQuizBySlug} from "@/app/(dashboard)/quiz/quiz";
import {dehydrate, HydrationBoundary, QueryClient} from "@tanstack/react-query";
import {QuizSolver} from "@/app/(dashboard)/quiz/[slug]/solve/QuizSolver";
import {Metadata} from "next";



export async function generateMetadata(
    { params }: {params:Promise<{ slug: string }>}): Promise<Metadata> {
    // read route params
    const { slug } = await params

    // fetch data
    const quizSlug = await getQuizBySlug(slug);

    return {
        title: quizSlug[0].title,
        description: quizSlug[0].description,
    }
}

export default async function SolveQuizPage({params}: {
    params: Promise<{ slug: string }>
}) {
    const {slug} = await params;
    const queryClient = new QueryClient();

    await Promise.allSettled([
        queryClient.prefetchQuery({
            queryKey: ["quiz", slug],
            queryFn: () => getQuizBySlug(slug),
        }),
        queryClient.prefetchQuery({
            queryKey: ["quiz", slug, "questions"],
            queryFn: () => getQuestionsBySlug(slug),
        }),
    ]);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="px-4 py-6 md:px-6">
                <QuizSolver key={slug} slug={slug}/>
            </div>
        </HydrationBoundary>
    );
}

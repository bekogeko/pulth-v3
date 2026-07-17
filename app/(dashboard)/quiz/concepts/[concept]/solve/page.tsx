import type {Metadata} from "next";
import {Suspense} from "react";
import {dehydrate, HydrationBoundary, QueryClient} from "@tanstack/react-query";
import {notFound, permanentRedirect} from "next/navigation";

import {QuizSolver} from "@/app/(dashboard)/quiz/QuizSolver";
import {QuizSolveSkeleton} from "@/app/(dashboard)/quiz/QuizSolveSkeleton";
import {QuestionOverview} from "@/app/(dashboard)/quiz/QuestionOverview";
import {createPracticeDescription} from "@/app/(dashboard)/quiz/practice-description";
import {getAllConcepts, getConceptByIdentifier, getQuestionsByConceptId} from "@/app/(dashboard)/quiz/quiz";
import {getAbsoluteUrl} from "@/lib/site-url";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
    const concepts = await getAllConcepts();
    return concepts.map(({slug}) => ({concept: slug}));
}

type SolveConceptPageProps = {
    params: Promise<{ concept: string }>;
};

type ConceptQuestion = Awaited<ReturnType<typeof getQuestionsByConceptId>>[number];

function createConceptJsonLd(
    concept: {name: string; description: string | null; slug: string},
    questions: ConceptQuestion[]
) {
    return {
        "@context": "https://schema.org",
        "@type": "Quiz",
        name: `${concept.name} practice questions`,
        description: concept.description ?? `Practice questions for ${concept.name}.`,
        url: getAbsoluteUrl(`/quiz/concepts/${concept.slug}/solve`),
        about: {
            "@type": "Thing",
            name: concept.name,
            description: concept.description ?? undefined,
        },
        hasPart: questions.map((question, index) => ({
            "@type": "Question",
            position: index + 1,
            name: question.question,
            text: question.body ? `${question.question}\n\n${question.body}` : question.question,
        })),
    };
}

export async function generateMetadata({params}: SolveConceptPageProps): Promise<Metadata> {
    const {concept: conceptParam} = await params;
    const concept = await getConceptByIdentifier(conceptParam).then((result) => result[0]);

    if (!concept) {
        notFound();
    }

    if (conceptParam !== concept.slug) {
        permanentRedirect(`/quiz/concepts/${concept.slug}/solve`);
    }

    const questions = await getQuestionsByConceptId(concept.id);
    const url = getAbsoluteUrl(`/quiz/concepts/${concept.slug}/solve`);
    const title = `Practice ${concept.name} Questions | Pulth`;
    const description = createPracticeDescription(concept.name, concept.description, questions.length);

    return {
        title,
        description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title,
            description,
            url,
            siteName: "Pulth",
            type: "website",
        },
        twitter: {
            card: "summary",
            title,
            description,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function SolveConceptPage({params}: SolveConceptPageProps) {
    const {concept: conceptParam} = await params;
    const concept = await getConceptByIdentifier(conceptParam).then((results) => results[0]);

    if (!concept) {
        notFound();
    }

    if (conceptParam !== concept.slug) {
        permanentRedirect(`/quiz/concepts/${concept.slug}/solve`);
    }

    const conceptId = concept.id;
    const questions = await getQuestionsByConceptId(conceptId);
    const queryClient = new QueryClient();

    await Promise.allSettled([
        queryClient.prefetchQuery({
            queryKey: ["concept", conceptId],
            queryFn: () => [concept],
        }),
        queryClient.prefetchQuery({
            queryKey: ["concept", conceptId, "questions"],
            queryFn: () => questions,
        }),
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                suppressHydrationWarning
                dangerouslySetInnerHTML={{__html: JSON.stringify(createConceptJsonLd(concept, questions))}}
            />
            <HydrationBoundary state={dehydrate(queryClient)}>
                <div className="px-4 py-6 md:px-6">
                    {/* Server-rendered h1 so crawlers (and assistive tech) always get a
                        page heading. QuizSolver renders the visible concept title, but it
                        reads useSearchParams() and so deopts to its Suspense fallback in the
                        prerendered HTML — leaving no h1 in the static markup without this. */}
                    <h1 className="sr-only">{concept.name}</h1>
                    {/* QuizSolver reads the `curriculum` search param via useSearchParams,
                        so it needs its own Suspense boundary. Without one, the closest
                        boundary is the segment's loading.tsx, which would deopt the whole
                        page (JSON-LD + overview) to client rendering. */}
                    <Suspense fallback={<QuizSolveSkeleton withPagePadding={false} />}>
                        <QuizSolver key={conceptId} target={{type: "concept", id: conceptId}} />
                    </Suspense>
                </div>
            </HydrationBoundary>
            <QuestionOverview title="Questions in this concept practice" questions={questions} />
        </>
    );
}

import type {Metadata} from "next";
import {dehydrate, HydrationBoundary, QueryClient} from "@tanstack/react-query";
import {notFound, permanentRedirect} from "next/navigation";

import {QuizSolver} from "@/app/(dashboard)/quiz/[slug]/solve/QuizSolver";
import {QuestionBodyBlock} from "@/app/(dashboard)/quiz/QuestionBodyBlock";
import {getConceptByIdentifier, getQuestionsByConceptId} from "@/app/(dashboard)/quiz/quiz";
import {getAbsoluteUrl} from "@/lib/site-url";

type SolveConceptPageProps = {
    params: Promise<{ conceptId: string }>;
};

type ConceptQuestion = Awaited<ReturnType<typeof getQuestionsByConceptId>>[number];

function createDescription(name: string, description: string | null | undefined, questionCount: number) {
    const prefix = questionCount > 0
        ? `Practice ${questionCount} ${questionCount === 1 ? "question" : "questions"} for ${name}.`
        : `Practice questions for ${name}.`;
    const body = description?.trim();
    const value = body ? `${prefix} ${body}` : prefix;

    return value.length > 160 ? `${value.slice(0, 157).trimEnd()}...` : value;
}

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

function QuestionOverview({questions}: {questions: ConceptQuestion[]}) {
    if (!questions.length) {
        return null;
    }

    return (
        <section className="mx-auto w-full max-w-4xl px-4 pb-10 md:px-6" aria-labelledby="concept-question-overview">
            <div className="rounded-lg border border-border/70 bg-background p-5">
                <h2 id="concept-question-overview" className="text-lg font-semibold tracking-tight">
                    Questions in this concept practice
                </h2>
                <ol className="mt-4 space-y-5">
                    {questions.map((question, index) => (
                        <li key={question.questionId} className="space-y-3">
                            <h3 className="font-medium leading-7">
                                {index + 1}. {question.question}
                            </h3>
                            <QuestionBodyBlock body={question.body} className="rounded-lg" />
                            {question.options?.length ? (
                                <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                    {question.options.map((option) => (
                                        <li key={option.id} className="rounded-md border border-border/60 px-3 py-2">
                                            {option.option}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

export async function generateMetadata({params}: SolveConceptPageProps): Promise<Metadata> {
    const {conceptId} = await params;
    const concept = await getConceptByIdentifier(conceptId).then((result) => result[0]);

    if (!concept) {
        notFound();
    }

    if (conceptId !== concept.slug) {
        permanentRedirect(`/quiz/concepts/${concept.slug}/solve`);
    }

    const questions = await getQuestionsByConceptId(concept.id);
    const url = getAbsoluteUrl(`/quiz/concepts/${concept.slug}/solve`);
    const title = `Practice ${concept.name} Questions | Pulth`;
    const description = createDescription(concept.name, concept.description, questions.length);

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
    const {conceptId: conceptIdParam} = await params;
    const concept = await getConceptByIdentifier(conceptIdParam).then((results) => results[0]);

    if (!concept) {
        notFound();
    }

    if (conceptIdParam !== concept.slug) {
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
                    <QuizSolver key={conceptId} conceptId={conceptId} />
                </div>
            </HydrationBoundary>
            <QuestionOverview questions={questions} />
        </>
    );
}

import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {dehydrate, HydrationBoundary, QueryClient} from "@tanstack/react-query";

import {getQuestionsBySlug, getQuizBySlug} from "@/app/(dashboard)/quiz/quiz";
import {QuizSolver} from "@/app/(dashboard)/quiz/[slug]/solve/QuizSolver";
import {QuestionBodyBlock} from "@/app/(dashboard)/quiz/QuestionBodyBlock";
import {getAbsoluteUrl} from "@/lib/site-url";

type SolveQuizPageProps = {
    params: Promise<{ slug: string }>;
};

type QuizQuestion = Awaited<ReturnType<typeof getQuestionsBySlug>>[number];

function createDescription(title: string, description: string | null | undefined, questionCount: number) {
    const prefix = questionCount > 0
        ? `Practice ${questionCount} ${questionCount === 1 ? "question" : "questions"} for ${title}.`
        : `Practice questions for ${title}.`;
    const body = description?.trim();
    const value = body ? `${prefix} ${body}` : prefix;

    return value.length > 160 ? `${value.slice(0, 157).trimEnd()}...` : value;
}

function createQuizJsonLd(quiz: {title: string; description: string; slug: string}, questions: QuizQuestion[]) {
    return {
        "@context": "https://schema.org",
        "@type": "Quiz",
        name: quiz.title,
        description: quiz.description,
        url: getAbsoluteUrl(`/quiz/${quiz.slug}/solve`),
        hasPart: questions.map((question, index) => ({
            "@type": "Question",
            position: index + 1,
            name: question.question,
            text: question.body ? `${question.question}\n\n${question.body}` : question.question,
        })),
    };
}

function QuestionOverview({questions}: {questions: QuizQuestion[]}) {
    if (!questions.length) {
        return null;
    }

    return (
        <section className="mx-auto w-full max-w-4xl px-4 pb-10 md:px-6" aria-labelledby="quiz-question-overview">
            <div className="rounded-lg border border-border/70 bg-background p-5">
                <h2 id="quiz-question-overview" className="text-lg font-semibold tracking-tight">
                    Questions in this practice
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

export async function generateMetadata({params}: SolveQuizPageProps): Promise<Metadata> {
    const {slug} = await params;
    const quiz = await getQuizBySlug(slug).then((results) => results[0]);

    if (!quiz) {
        notFound();
    }

    const questions = await getQuestionsBySlug(slug);
    const url = getAbsoluteUrl(`/quiz/${quiz.slug}/solve`);
    const title = `${quiz.title} Practice Quiz | Pulth`;
    const description = createDescription(quiz.title, quiz.description, questions.length);

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

export default async function SolveQuizPage({params}: SolveQuizPageProps) {
    const {slug} = await params;
    const quiz = await getQuizBySlug(slug).then((results) => results[0]);

    if (!quiz) {
        notFound();
    }

    const questions = await getQuestionsBySlug(slug);
    const queryClient = new QueryClient();

    await Promise.allSettled([
        queryClient.prefetchQuery({
            queryKey: ["quiz", slug],
            queryFn: () => [quiz],
        }),
        queryClient.prefetchQuery({
            queryKey: ["quiz", slug, "questions"],
            queryFn: () => questions,
        }),
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                suppressHydrationWarning
                dangerouslySetInnerHTML={{__html: JSON.stringify(createQuizJsonLd(quiz, questions))}}
            />
            <HydrationBoundary state={dehydrate(queryClient)}>
                <div className="px-4 py-6 md:px-6">
                    <QuizSolver key={slug} slug={slug}/>
                </div>
            </HydrationBoundary>
            <QuestionOverview questions={questions} />
        </>
    );
}

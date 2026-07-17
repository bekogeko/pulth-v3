import type {Metadata} from "next";
import {Suspense} from "react";
import {dehydrate, HydrationBoundary, QueryClient} from "@tanstack/react-query";
import {notFound} from "next/navigation";

import {QuizSolver} from "@/app/(dashboard)/quiz/QuizSolver";
import {QuizSolveSkeleton} from "@/app/(dashboard)/quiz/QuizSolveSkeleton";
import {QuestionOverview} from "@/app/(dashboard)/quiz/QuestionOverview";
import {createPracticeDescription} from "@/app/(dashboard)/quiz/practice-description";
import {getQuestionsByTopicId, getTopicBySlug} from "@/app/(dashboard)/quiz/quiz";
import {getCurriculumTopicSlugs} from "@/app/actions/subject";
import {getAbsoluteUrl} from "@/lib/site-url";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
    const topics = await getCurriculumTopicSlugs();
    return topics.map(({topicSlug}) => ({topicSlug}));
}

type SolveTopicPageProps = {
    params: Promise<{ topicSlug: string }>;
};

type TopicQuestion = Awaited<ReturnType<typeof getQuestionsByTopicId>>[number];

function createTopicJsonLd(
    topic: {name: string; description: string; slug: string},
    questions: TopicQuestion[]
) {
    return {
        "@context": "https://schema.org",
        "@type": "Quiz",
        name: `${topic.name} practice questions`,
        description: topic.description || `Practice questions for ${topic.name}.`,
        url: getAbsoluteUrl(`/quiz/topics/${topic.slug}/solve`),
        about: {
            "@type": "Thing",
            name: topic.name,
            description: topic.description || undefined,
        },
        hasPart: questions.map((question, index) => ({
            "@type": "Question",
            position: index + 1,
            name: question.question,
            text: question.body ? `${question.question}\n\n${question.body}` : question.question,
        })),
    };
}

export async function generateMetadata({params}: SolveTopicPageProps): Promise<Metadata> {
    const {topicSlug} = await params;
    const topic = await getTopicBySlug(topicSlug).then((results) => results[0]);

    if (!topic) {
        notFound();
    }

    const questions = await getQuestionsByTopicId(topic.id);
    const url = getAbsoluteUrl(`/quiz/topics/${topic.slug}/solve`);
    const title = `Practice ${topic.name} Questions | Pulth`;
    const description = createPracticeDescription(topic.name, topic.description, questions.length);

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

export default async function SolveTopicPage({params}: SolveTopicPageProps) {
    const {topicSlug} = await params;
    const topic = await getTopicBySlug(topicSlug).then((results) => results[0]);

    if (!topic) {
        notFound();
    }

    const topicId = topic.id;
    const questions = await getQuestionsByTopicId(topicId);
    const queryClient = new QueryClient();

    await Promise.allSettled([
        queryClient.prefetchQuery({
            queryKey: ["topic", topicId],
            queryFn: () => [topic],
        }),
        queryClient.prefetchQuery({
            queryKey: ["topic", topicId, "questions"],
            queryFn: () => questions,
        }),
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                suppressHydrationWarning
                dangerouslySetInnerHTML={{__html: JSON.stringify(createTopicJsonLd(topic, questions))}}
            />
            <HydrationBoundary state={dehydrate(queryClient)}>
                <div className="px-4 py-6 md:px-6">
                    {/* Server-rendered h1 so crawlers (and assistive tech) always get a
                        page heading. QuizSolver renders the visible topic title, but it
                        reads useSearchParams() and so deopts to its Suspense fallback in the
                        prerendered HTML — leaving no h1 in the static markup without this. */}
                    <h1 className="sr-only">{topic.name}</h1>
                    {/* QuizSolver reads search params via useSearchParams, so it needs its
                        own Suspense boundary. Without one, the closest boundary is the
                        segment's loading.tsx, which would deopt the whole page (JSON-LD +
                        overview) to client rendering. */}
                    <Suspense fallback={<QuizSolveSkeleton withPagePadding={false} />}>
                        <QuizSolver key={topicId} target={{type: "topic", id: topicId}} />
                    </Suspense>
                </div>
            </HydrationBoundary>
            <QuestionOverview title="Questions in this topic practice" questions={questions} />
        </>
    );
}

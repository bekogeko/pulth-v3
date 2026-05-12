import {getAllQuizzes, getAllTopicsWithConcepts} from "@/app/(dashboard)/quiz/quiz";
import {QuizList} from "@/app/(dashboard)/quiz/QuizList";
import {TopicList} from "@/app/(dashboard)/quiz/TopicList";

type QuizPageProps = {
    searchParams: Promise<{
        topic?: string | string[];
    }>;
};

export default async function Quiz({searchParams}: QuizPageProps) {
    const {topic} = await searchParams;
    const selectedTopicSlug = Array.isArray(topic) ? topic[0] : topic;

    const [quizzes, topics] = await Promise.all([
        getAllQuizzes(),
        getAllTopicsWithConcepts(),
    ]);
    const selectedTopic = selectedTopicSlug
        ? topics.find((item) => item.slug === selectedTopicSlug)
        : undefined;
    const quizSection = (
        <section className="space-y-3" aria-labelledby="quiz-sets-heading">
            <div className="space-y-1">
                <h2 id="quiz-sets-heading" className="text-lg font-semibold">Quizzes</h2>
                <p className="text-sm text-muted-foreground">
                    Browse every quiz, check how many questions it has, and jump into editing or solving.
                </p>
            </div>
            <QuizList quizzes={quizzes} isLoading={false} />
        </section>
    );
    const topicSection = (
        <section
            className="space-y-3"
            aria-labelledby={selectedTopic ? "selected-topic-practice-heading" : "topic-practice-heading"}
        >
            {!selectedTopic ? (
                <div className="space-y-1">
                    <h2 id="topic-practice-heading" className="text-lg font-semibold">Topics</h2>
                    <p className="text-sm text-muted-foreground">
                        Browse topics and solve questions for one concept at a time.
                    </p>
                </div>
            ) : null}
            <TopicList
                topics={topics}
                isLoading={false}
                selectedTopicSlug={selectedTopicSlug}
                showActiveTopicHeader={!selectedTopic}
                showSelectedTopicHeading={Boolean(selectedTopic)}
            />
        </section>
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            {selectedTopic ? topicSection : quizSection}
            {selectedTopic ? quizSection : topicSection}
        </div>
    );
}

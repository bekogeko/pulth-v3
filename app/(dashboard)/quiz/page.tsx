import {getAllQuizzes, getAllTopicsWithConcepts} from "@/app/(dashboard)/quiz/quiz";
import {QuizList} from "@/app/(dashboard)/quiz/QuizList";
import {TopicList} from "@/app/(dashboard)/quiz/TopicList";

export default async function Quiz() {
    const [quizzes, topics] = await Promise.all([
        getAllQuizzes(),
        getAllTopicsWithConcepts(),
    ]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Quizzes</h2>
                    <p className="text-sm text-muted-foreground">
                        Browse every quiz, check how many questions it has, and jump into editing or solving.
                    </p>
                </div>
                <QuizList quizzes={quizzes} isLoading={false} />
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Topics</h2>
                    <p className="text-sm text-muted-foreground">
                        Browse topics and solve questions for one concept at a time.
                    </p>
                </div>
                <TopicList topics={topics} isLoading={false} />
            </div>
        </div>
    );
}

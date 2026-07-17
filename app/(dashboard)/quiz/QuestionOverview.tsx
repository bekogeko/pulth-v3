import {QuestionBodyBlock} from "@/app/(dashboard)/quiz/QuestionBodyBlock";

type PracticeQuestion = {
    questionId: number;
    question: string;
    body: string | null;
    options: {id: number; option: string}[];
};

type QuestionOverviewProps = {
    title: string;
    questions: PracticeQuestion[];
};

// Server-rendered question list below the interactive solver so crawlers see
// the full practice content even though QuizSolver is client-only.
export function QuestionOverview({title, questions}: QuestionOverviewProps) {
    if (!questions.length) {
        return null;
    }

    return (
        <section className="mx-auto w-full max-w-4xl px-4 pb-10 md:px-6" aria-labelledby="practice-question-overview">
            <div className="rounded-lg border border-border/70 bg-background p-5">
                <h2 id="practice-question-overview" className="text-lg font-semibold tracking-tight">
                    {title}
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

import Link from "next/link";
import {ArrowUpRight, CircleHelp, ClipboardList, Trophy} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

const faqs = [
    {
        question: "What can I do with Pulth?",
        answer: "Pulth helps you practice quizzes by topic, solve concept-focused questions, and track how concepts rank based on learner ratings.",
    },
    {
        question: "How do I start practicing?",
        answer: "Open Quizzes, pick a quiz or topic concept, and start the solver. Each question shows answer options and lets you move through the practice set at your own pace.",
    },
    {
        question: "What are concepts?",
        answer: "Concepts are focused learning areas inside a topic. A topic can contain multiple concepts, and questions can be attached to concepts so you can practice one specific skill or idea at a time.",
    },
    {
        question: "How does ranking work?",
        answer: "Rankings are based on learner ratings for concepts. Pulth averages the ratings submitted for each concept, shows how many learners contributed, and orders concepts inside each topic by their community score.",
    },
    {
        question: "What are concept rankings?",
        answer: "Concept rankings summarize community ratings for each concept inside a topic. They make it easier to see which concepts are strongest and where more practice may be useful.",
    },
    {
        question: "Can I see my own rankings?",
        answer: "Yes. When you are signed in, My Ranks shows the concepts you have rated, your average rating, and how many answers contributed to those ratings.",
    },
    {
        question: "Why does a quiz or concept show no questions?",
        answer: "A quiz or concept can exist before questions are attached to it. Once questions are added, the practice action becomes available.",
    },
    {
        question: "How are topics different from quizzes?",
        answer: "Quizzes are fixed practice sets. Topics group related concepts so you can focus on one area and practice questions attached to a specific concept.",
    },
];

export default function FaqPage() {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <CircleHelp className="size-4" />
                        Help
                    </div>
                    <h2 className="text-lg font-semibold">FAQ</h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                        Answers to common questions about practicing quizzes, concept rankings, and account-based progress.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/ranking">
                            <Trophy className="size-4" />
                            Rankings
                        </Link>
                    </Button>
                    <Button asChild size="lg">
                        <Link href="/quiz">
                            <ClipboardList className="size-4" />
                            Practice
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-3">
                    {faqs.map((item) => (
                        <Card key={item.question}>
                            <CardHeader className="gap-2">
                                <CardTitle className="text-base leading-6">{item.question}</CardTitle>
                                <CardDescription className="text-sm leading-6">
                                    {item.answer}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Quick links</CardTitle>
                        <CardDescription>
                            Jump back into the main Pulth workflows.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button asChild variant="outline" className="w-full justify-between">
                            <Link href="/quiz">
                                Browse quizzes
                                <ArrowUpRight className="size-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full justify-between">
                            <Link href="/ranking">
                                View rankings
                                <ArrowUpRight className="size-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full justify-between">
                            <Link href="/ranking/self">
                                My ranks
                                <ArrowUpRight className="size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

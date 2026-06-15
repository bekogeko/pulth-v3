import {getAdminOverview} from "@/app/actions/admin";
import {Card, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

export default async function AdminOverviewPage() {
    const stats = await getAdminOverview();

    if (!stats) {
        return null;
    }

    const cards = [
        {
            label: "Articles",
            value: stats.articles,
            hint: `${stats.publishedArticles} published, ${stats.articles - stats.publishedArticles} drafts`,
        },
        {
            label: "Questions",
            value: stats.questions,
            hint: `${stats.answers} answers submitted`,
        },
        {
            label: "Concepts",
            value: stats.concepts,
            hint: null,
        },
        {
            label: "Curriculums",
            value: stats.curriculums,
            hint: null,
        },
        {
            label: "Topics",
            value: stats.topics,
            hint: null,
        },
        {
            label: "Subjects",
            value: stats.subjects,
            hint: null,
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
                <Card key={card.label}>
                    <CardHeader>
                        <CardDescription>{card.label}</CardDescription>
                        <CardTitle className="text-3xl tabular-nums">{card.value}</CardTitle>
                        {card.hint ? (
                            <p className="text-xs text-muted-foreground">{card.hint}</p>
                        ) : null}
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
}

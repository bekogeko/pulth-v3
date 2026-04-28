import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight, BookOpenText} from "lucide-react";

import {getArticles} from "@/app/actions/article";
import {Button} from "@/components/ui/button";

export const metadata: Metadata = {
    title: "Articles",
    description: "Read published Pulth articles.",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
});

function formatArticleDate(date: Date | null) {
    if (!date) {
        return "Unscheduled";
    }

    return dateFormatter.format(date);
}

export default async function ArticlesPage() {
    const articles = await getArticles();

    return (
        <main className="min-h-dvh bg-background text-foreground">
            <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <BookOpenText className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-normal">Articles</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                Published articles from Pulth.
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/">Home</Link>
                    </Button>
                </div>

                {articles.length > 0 ? (
                    <div className="divide-y divide-border rounded-lg border border-border bg-card">
                        {articles.map((article) => (
                            <article key={article.id} className="p-5 transition-colors hover:bg-muted/40 sm:p-6">
                                <Link href={`/app/(dashboard)/articles/${article.slug}`} className="group block">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {formatArticleDate(article.publishedAt ?? article.createdAt)}
                                            </p>
                                            <h2 className="text-xl font-semibold leading-snug group-hover:text-primary">
                                                {article.title}
                                            </h2>
                                            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                                {article.description}
                                            </p>
                                        </div>
                                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                    </div>
                                </Link>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
                        <h2 className="text-base font-semibold">No articles yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Published articles will appear here.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}

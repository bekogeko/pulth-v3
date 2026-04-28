"use client";

import Link from "next/link";
import {Edit, ExternalLink} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Article = Awaited<ReturnType<typeof import("@/app/actions/article").getMyArticles>>[number];

const dateFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
});

function formatDate(date: Date | null) {
    if (!date) {
        return "-";
    }

    return dateFormatter.format(date);
}

function TagsCell({items}: {items: string[]}) {
    if (!items.length) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <div className="flex max-w-xs flex-wrap gap-1">
            {items.slice(0, 3).map((item) => (
                <span key={item} className="rounded-md bg-muted px-2 py-1 text-[11px] leading-none text-muted-foreground">
                    {item}
                </span>
            ))}
            {items.length > 3 ? (
                <span className="rounded-md bg-muted px-2 py-1 text-[11px] leading-none text-foreground">
                    {items.length - 3} more
                </span>
            ) : null}
        </div>
    );
}

export function ArticlesDataTable({articles}: {articles: Article[]}) {
    return (
        <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Concepts</TableHead>
                        <TableHead>Topics</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {articles.length ? articles.map((article) => (
                        <TableRow key={article.id}>
                            <TableCell>
                                <div className="max-w-sm space-y-1">
                                    <div className="font-medium">{article.title}</div>
                                    <div className="line-clamp-1 text-xs text-muted-foreground">
                                        {article.description}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                    {article.isPublished ? "Published" : "Draft"}
                                </span>
                            </TableCell>
                            <TableCell>
                                <TagsCell items={article.concepts.map((concept) => concept.name)}/>
                            </TableCell>
                            <TableCell>
                                <TagsCell items={article.topics.map((topic) => topic.title)}/>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {formatDate(article.updatedAt)}
                            </TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-1">
                                    <Button asChild variant="ghost" size="icon-sm">
                                        <Link href={`/articles/${article.slug}/edit`} aria-label={`Edit ${article.title}`}>
                                            <Edit className="size-4"/>
                                        </Link>
                                    </Button>
                                    {article.isPublished ? (
                                        <Button asChild variant="ghost" size="icon-sm">
                                            <Link href={`/articles/${article.slug}`} aria-label={`View ${article.title}`}>
                                                <ExternalLink className="size-4"/>
                                            </Link>
                                        </Button>
                                    ) : null}
                                </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                No articles yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

export function ArticlesDataTableSkeleton() {
    return (
        <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="space-y-3 p-4">
                {Array.from({length: 6}).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full"/>
                ))}
            </div>
        </div>
    );
}

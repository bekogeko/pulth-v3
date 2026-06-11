"use client";

import {useState} from "react";
import Link from "next/link";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ExternalLink, Trash2} from "lucide-react";
import {toast} from "sonner";

import {adminDeleteArticle, adminSetArticlePublished, getAdminArticles} from "@/app/actions/admin";
import {ConfirmDialog} from "@/app/admin/confirm-dialog";
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

type AdminArticle = Awaited<ReturnType<typeof getAdminArticles>>[number];

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

export default function AdminArticlesPage() {
    const queryClient = useQueryClient();
    const [deleteTarget, setDeleteTarget] = useState<AdminArticle | null>(null);

    const {data: articles, isLoading} = useQuery({
        queryKey: ["admin", "articles"],
        queryFn: getAdminArticles,
    });

    const publishMutation = useMutation({
        mutationFn: (input: {articleId: number; isPublished: boolean}) =>
            adminSetArticlePublished(input.articleId, input.isPublished),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "articles"]});
            toast.success(result.message);
        },
        onError: () => {
            toast.error("Unable to update the article right now.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (articleId: number) => adminDeleteArticle(articleId),
        onSuccess: async (result) => {
            if (result.status === "error") {
                toast.error(result.message);
                return;
            }

            await queryClient.invalidateQueries({queryKey: ["admin", "articles"]});
            toast.success(result.message);
            setDeleteTarget(null);
        },
        onError: () => {
            toast.error("Unable to delete the article right now.");
        },
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold">Articles</h2>
                <p className="text-sm text-muted-foreground">
                    Moderate every article on the platform: publish, unpublish, or remove content.
                </p>
            </div>

            {deleteTarget ? (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteTarget(null);
                        }
                    }}
                    title="Delete article"
                    description={`"${deleteTarget.title}" and its concept/topic links will be permanently deleted. This cannot be undone.`}
                    confirmLabel="Delete article"
                    isPending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                />
            ) : null}

            {isLoading ? (
                <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="space-y-3 p-4">
                        {Array.from({length: 6}).map((_, index) => (
                            <Skeleton key={index} className="h-12 w-full"/>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Published</TableHead>
                                <TableHead className="w-44 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {articles?.length ? articles.map((article) => (
                                <TableRow key={article.id}>
                                    <TableCell>
                                        <div className="max-w-sm space-y-1">
                                            <div className="font-medium">{article.title}</div>
                                            <div className="line-clamp-1 text-xs text-muted-foreground">
                                                {article.description}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {article.authorName}
                                    </TableCell>
                                    <TableCell>
                                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                            {article.isPublished ? "Published" : "Draft"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(article.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(article.publishedAt)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            {article.isPublished ? (
                                                <Button asChild variant="ghost" size="icon-sm">
                                                    <Link
                                                        href={`/articles/${article.slug}`}
                                                        aria-label={`View ${article.title}`}
                                                    >
                                                        <ExternalLink className="size-4"/>
                                                    </Link>
                                                </Button>
                                            ) : null}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={publishMutation.isPending}
                                                onClick={() => publishMutation.mutate({
                                                    articleId: article.id,
                                                    isPublished: !article.isPublished,
                                                })}
                                            >
                                                {article.isPublished ? "Unpublish" : "Publish"}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Delete ${article.title}`}
                                                onClick={() => setDeleteTarget(article)}
                                            >
                                                <Trash2 className="size-4 text-destructive"/>
                                            </Button>
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
            )}
        </div>
    );
}

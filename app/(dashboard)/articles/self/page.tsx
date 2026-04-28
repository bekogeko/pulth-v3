"use client";

import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Plus} from "lucide-react";

import {getMyArticles} from "@/app/actions/article";
import {CreateArticleDialog} from "@/app/(dashboard)/articles/self/create-article-dialog";
import {ArticlesDataTable, ArticlesDataTableSkeleton} from "@/app/(dashboard)/articles/self/data-table";
import {Button} from "@/components/ui/button";

export default function MyArticlesPage() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const {data: articles, isLoading} = useQuery({
        queryKey: ["articles", "self"],
        queryFn: getMyArticles,
    });

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">My Articles</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage article drafts, publishing state, concepts, and topics.
                    </p>
                </div>
                <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="size-4"/>
                    Create article
                </Button>
            </div>

            {isCreateDialogOpen ? (
                <CreateArticleDialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                />
            ) : null}

            {isLoading ? (
                <ArticlesDataTableSkeleton/>
            ) : (
                <ArticlesDataTable articles={articles ?? []}/>
            )}
        </div>
    );
}

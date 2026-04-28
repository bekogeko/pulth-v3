import {notFound} from "next/navigation";

import {getArticleEditorOptions, getMyArticleForEdit} from "@/app/actions/article";
import {ArticleEditor} from "@/app/(dashboard)/articles/[slug]/edit/ArticleEditor";

type ArticleEditPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export default async function ArticleEditPage({params}: ArticleEditPageProps) {
    const {slug} = await params;
    const [article, options] = await Promise.all([
        getMyArticleForEdit(slug),
        getArticleEditorOptions(),
    ]);

    if (!article) {
        notFound();
    }

    return (
        <ArticleEditor
            article={article}
            concepts={options.concepts}
            topics={options.topics}
        />
    );
}

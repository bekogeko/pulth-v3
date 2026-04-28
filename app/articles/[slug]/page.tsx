import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getArticleBySlug} from "@/app/actions/article";
import ArticleRenderer from "@/app/articles/[slug]/ArticleRenderer";

type ArticlePageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export async function generateMetadata({params}: ArticlePageProps): Promise<Metadata> {
    const {slug} = await params;
    const article = await getArticleBySlug(slug);

    if (!article) {
        return {
            title: "Article not found",
        };
    }

    return {
        title: article.title,
        description: article.description,
    };
}

export default async function ArticlePage({params}: ArticlePageProps) {
    const {slug} = await params;
    const article = await getArticleBySlug(slug);

    if (!article) {
        notFound();
    }

    return (
        <ArticleRenderer
            title={article.title}
            description={article.description}
            body={article.body}
        />
    );
}

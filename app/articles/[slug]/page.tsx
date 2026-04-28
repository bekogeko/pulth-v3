import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {getArticleBySlug} from "@/app/actions/article";
import ArticleRenderer from "@/app/articles/[slug]/ArticleRenderer";
import {getAbsoluteUrl} from "@/lib/site-url";

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
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const url = getAbsoluteUrl(`/articles/${article.slug}`);
    const publishedTime = article.publishedAt?.toISOString();
    const modifiedTime = article.updatedAt?.toISOString();

    return {
        title: article.title,
        description: article.description,
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: article.title,
            description: article.description,
            url,
            siteName: "Pulth",
            type: "article",
            publishedTime,
            modifiedTime,
        },
        twitter: {
            card: "summary",
            title: article.title,
            description: article.description,
        },
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

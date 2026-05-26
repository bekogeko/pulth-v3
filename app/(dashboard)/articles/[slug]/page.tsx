import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {getArticleBySlug, getPublishedArticleSlugs} from "@/app/actions/article";
import ArticleRenderer from "@/app/(dashboard)/articles/[slug]/ArticleRenderer";
import {getAbsoluteUrl} from "@/lib/site-url";

export const revalidate = false;
export const dynamicParams = true;

type ArticleJsonLd = {
    slug: string;
    title: string;
    description: string;
    publishedAt: Date | null;
    updatedAt: Date | null;
};

function createArticleJsonLd({slug, title, description, publishedAt, updatedAt}: ArticleJsonLd) {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        url: getAbsoluteUrl(`/articles/${slug}`),
        datePublished: publishedAt?.toISOString(),
        dateModified: (updatedAt ?? publishedAt)?.toISOString(),
        publisher: {
            "@type": "Organization",
            name: "Pulth",
            url: getAbsoluteUrl("/"),
        },
    };
}

type ArticlePageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export async function generateStaticParams() {
    const articles = await getPublishedArticleSlugs();

    return articles.map((article) => ({
        slug: article.slug,
    }));
}

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
        <>
            <script type="application/ld+json">
                {JSON.stringify(createArticleJsonLd(article))}
            </script>
            <ArticleRenderer
                title={article.title}
                description={article.description}
                body={article.body}
                concepts={article.concepts}
                topics={article.topics}
            />
        </>
    );
}

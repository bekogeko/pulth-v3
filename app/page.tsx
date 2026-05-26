import type {Metadata} from "next";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardList,
  LibraryBig,
  Trophy,
} from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Pulth — Independent Learning",
    description: "Practice quizzes and read articles across any topic. Track your difficulty ratings and improve with targeted concept practice.",
};

import { getArticles } from "@/app/actions/article";
import { Button } from "@/components/ui/button";

const quickLinks = [
  {
    title: "Quizzes",
    description: "Practice with focused question sets.",
    href: "/quiz",
    icon: ClipboardList,
  },
  {
    title: "Ranks",
    description: "Track movement across concepts.",
    href: "/ranking",
    icon: Trophy,
  },
];

function formatArticleDate(date: Date | null) {
  if (!date) {
    return "Unscheduled";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function Home() {
  const articles = await getArticles();
  const recentArticles = articles.slice(0, 5);
  const featuredArticle = recentArticles[0];
  const supportingArticles = recentArticles.slice(1);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Pulth home">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Brain className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide">Pulth</span>
          </Link>

          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <Button asChild variant="ghost" size="lg">
                <SignInButton>Sign in</SignInButton>
              </Button>
              <Button asChild size="lg">
                <SignUpButton>Sign up</SignUpButton>
              </Button>
            </Show>
            <Show when="signed-in">
              <Button asChild variant="ghost" size="lg">
                <Link href="/ranking">Ranks</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/quiz">
                  Quizzes
                  <ArrowRight />
                </Link>
              </Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.78fr_1.22fr] md:py-14 lg:px-8">
          <div className="flex max-w-xl flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <LibraryBig className="size-3.5 text-primary" />
                Recent articles
              </div>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
                  Read the latest Pulth articles.
                </h1>
                <p className="max-w-lg text-base leading-7 text-muted-foreground">
                  New explanations, concept notes, and practice material collected in one place before you jump into quizzes.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Show when="signed-out">
                <Button asChild size="lg" className="h-10 px-4 text-sm">
                  <SignUpButton>Start practicing</SignUpButton>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm">
                  <SignInButton>Sign in</SignInButton>
                </Button>
              </Show>
              <Show when="signed-in">
                <Button asChild size="lg" className="h-10 px-4 text-sm">
                  <Link href="/quiz">
                    Open quizzes
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm">
                  <Link href="/ranking">View ranks</Link>
                </Button>
              </Show>
            </div>
          </div>

          {featuredArticle ? (
            <Link
              href={`/articles/${featuredArticle.slug}`}
              className="group grid min-h-[360px] overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors hover:border-primary/50"
            >
              <div className="flex min-h-36 items-end bg-[linear-gradient(135deg,var(--primary)_0%,var(--chart-2)_46%,var(--foreground)_100%)] p-5 text-primary-foreground">
                <div className="flex size-12 items-center justify-center rounded-md bg-background/15">
                  <BookOpen className="size-6" />
                </div>
              </div>
              <div className="flex flex-col justify-between gap-8 p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    <span>{formatArticleDate(featuredArticle.publishedAt ?? featuredArticle.createdAt)}</span>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold leading-tight tracking-normal text-balance sm:text-3xl">
                      {featuredArticle.title}
                    </h2>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {featuredArticle.description}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Read article
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex min-h-[360px] flex-col justify-between rounded-lg border border-dashed border-border bg-card p-6">
              <div className="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <BookOpen className="size-6" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-normal">No articles published yet.</h2>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Published articles will appear here automatically, newest first.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_18rem] md:py-12 lg:px-8">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Recent articles</h2>
              <p className="mt-1 text-sm text-muted-foreground">Freshly published reading from Pulth.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {supportingArticles.length > 0 ? (
              supportingArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="group grid gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      <span>{formatArticleDate(article.publishedAt ?? article.createdAt)}</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold leading-snug tracking-normal text-balance">
                        {article.title}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {article.description}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Read
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                {featuredArticle
                  ? "More articles will appear here as they are published."
                  : "There are no published articles to show yet."}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
              >
                <div className="mb-5 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </aside>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Pulth</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/privacy" className="font-medium transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="font-medium transition-colors hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

import type {Metadata} from "next";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LibraryBig,
} from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Pulth — Independent Learning",
    description: "Browse subjects and curriculums, practice questions by concept, and read articles. Track your difficulty ratings and improve with targeted practice.",
};

import { getArticles } from "@/app/actions/article";
import { getSubjectsWithCurriculums } from "@/app/actions/subject";
import { getConceptsForPractice } from "@/app/(dashboard)/quiz/quiz";
import { Button } from "@/components/ui/button";

const FEATURED_CONCEPT_COUNT = 6;
const FEATURED_SUBJECT_CURRICULUM_COUNT = 4;
const RECENT_ARTICLE_COUNT = 5;

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

function SectionHeading({
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {viewAllHref ? (
        <Button asChild variant="outline">
          <Link href={viewAllHref}>
            {viewAllLabel ?? "View all"}
            <ArrowRight />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export default async function Home() {
  const [articles, subjects, concepts] = await Promise.all([
    getArticles(),
    getSubjectsWithCurriculums(),
    getConceptsForPractice(),
  ]);

  const recentArticles = articles.slice(0, RECENT_ARTICLE_COUNT);
  const featuredArticle = recentArticles[0];
  const supportingArticles = recentArticles.slice(1);

  const practiceConcepts = concepts
    .filter((concept) => Number(concept.questionCount) > 0)
    .slice(0, FEATURED_CONCEPT_COUNT);

  const curriculumCount = subjects.reduce(
    (total, subject) => total + subject.curriculums.length,
    0,
  );
  const stats = [
    { label: "Subjects", value: subjects.length },
    { label: "Curriculums", value: curriculumCount },
    { label: "Concepts", value: concepts.length },
    { label: "Articles", value: articles.length },
  ];

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

          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost">
              <Link href="/subjects">Subjects</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/quiz">Quizzes</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/articles">Articles</Link>
            </Button>
          </nav>

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
              <Button asChild size="lg">
                <Link href="/quiz">
                  Practice
                  <ArrowRight />
                </Link>
              </Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <GraduationCap className="size-3.5 text-primary" />
              Independent learning
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
                Pick a subject. Practice by concept. Read as you go.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Pulth organizes learning into subjects and curriculums, with question
                practice for every concept and articles that explain the ideas behind them.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Show when="signed-out">
                <Button asChild size="lg" className="h-10 px-4 text-sm">
                  <SignUpButton>Start practicing</SignUpButton>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm">
                  <Link href="/subjects">Browse subjects</Link>
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
                  <Link href="/subjects">Browse subjects</Link>
                </Button>
              </Show>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-background p-4 shadow-sm"
              >
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Subjects"
            title="Browse by subject"
            description="Every subject is organized into curriculums you can follow topic by topic."
            viewAllHref="/subjects"
            viewAllLabel="All subjects"
          />

          {subjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
                >
                  <Link href={`/${subject.slug}`} className="group flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <LibraryBig className="size-4" />
                      </span>
                      <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
                        {subject.name}
                      </h3>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>

                  {subject.curriculums.length > 0 ? (
                    <ul className="mt-4 space-y-1 border-t border-border pt-4">
                      {subject.curriculums.slice(0, FEATURED_SUBJECT_CURRICULUM_COUNT).map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/${subject.slug}/${item.slug}`}
                            className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                          >
                            <span className="truncate">{item.name}</span>
                            <ArrowRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        </li>
                      ))}
                      {subject.curriculums.length > FEATURED_SUBJECT_CURRICULUM_COUNT ? (
                        <li>
                          <Link
                            href={`/${subject.slug}`}
                            className="block rounded-md px-2 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-muted/40"
                          >
                            +{subject.curriculums.length - FEATURED_SUBJECT_CURRICULUM_COUNT} more curriculums
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                      No curriculums yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
              <h3 className="text-base font-semibold">No subjects yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Subjects and their curriculums will appear here once they are created.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Questions"
            title="Practice by concept"
            description="Solve questions one concept at a time and watch your rating move."
            viewAllHref="/quiz"
            viewAllLabel="All concepts"
          />

          {practiceConcepts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {practiceConcepts.map((concept) => {
                const conceptQuestionCount = Number(concept.questionCount);

                return (
                  <Link
                    key={concept.id}
                    href={`/quiz/concepts/${concept.slug}/solve`}
                    prefetch={false}
                    className="group flex flex-col justify-between gap-6 rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold leading-snug text-balance group-hover:text-primary">
                          {concept.name}
                        </h3>
                        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {conceptQuestionCount} question{conceptQuestionCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {concept.description ? (
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {concept.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                      Practice
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card px-5 py-12 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <ClipboardList className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold">No practice questions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Concepts with questions will show up here, ready to practice.
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Articles"
            title="Latest articles"
            description="Explanations and concept notes to read alongside your practice."
            viewAllHref="/articles"
            viewAllLabel="All articles"
          />

          {featuredArticle ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <Link
                href={`/articles/${featuredArticle.slug}`}
                className="group flex flex-col justify-between gap-8 rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    <span>{formatArticleDate(featuredArticle.publishedAt ?? featuredArticle.createdAt)}</span>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold leading-tight tracking-normal text-balance sm:text-3xl">
                      {featuredArticle.title}
                    </h3>
                    <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                      {featuredArticle.description}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Read article
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              <div className="grid gap-3">
                {supportingArticles.length > 0 ? (
                  supportingArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/articles/${article.slug}`}
                      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        <span>{formatArticleDate(article.publishedAt ?? article.createdAt)}</span>
                      </div>
                      <h3 className="text-base font-semibold leading-snug tracking-normal text-balance group-hover:text-primary">
                        {article.title}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {article.description}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                    More articles will appear here as they are published.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-12 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <BookOpen className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold">No articles published yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Published articles will appear here automatically, newest first.
              </p>
            </div>
          )}
        </div>
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

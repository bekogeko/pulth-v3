import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ClipboardList,
  Layers3,
  Trophy,
} from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const tracks = [
  {
    title: "Quizzes",
    description: "Browse sets, answer questions, and keep practice focused.",
    href: "/quiz",
    icon: ClipboardList,
  },
  {
    title: "Concepts",
    description: "Work through one topic area at a time.",
    href: "/quiz",
    icon: Layers3,
  },
  {
    title: "Ranks",
    description: "Compare concept ratings from solved activity.",
    href: "/ranking",
    icon: Trophy,
  },
];

const sessionRows = [
  { label: "Data modeling", value: "84%", tone: "bg-primary" },
  { label: "React state", value: "72%", tone: "bg-chart-2" },
  { label: "SQL joins", value: "66%", tone: "bg-amber-500" },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,var(--background)_0%,var(--muted)_100%)] text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
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
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-10 pt-8 sm:px-6 md:grid-cols-[1fr_0.88fr] md:pb-16 md:pt-14 lg:px-8">
        <div className="max-w-2xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <BookOpenCheck className="size-3.5 text-primary" />
            Learn by questioning
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl lg:text-6xl">
              Practice quizzes that turn answers into sharper concept ratings.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Pulth keeps quiz solving, concept practice, and personal ranking in one focused workspace.
            </p>
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

        <div className="relative min-h-[430px] overflow-hidden rounded-lg border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Quiz session</span>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Current prompt
                  </p>
                  <h2 className="mt-2 text-lg font-semibold leading-snug">
                    Which index strategy best supports this query?
                  </h2>
                </div>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckCircle2 className="size-5" />
                </div>
              </div>

              <div className="grid gap-2">
                {["Composite index", "Sequential scan", "Hash aggregate"].map((item, index) => (
                  <div
                    key={item}
                    className={
                      index === 0
                        ? "flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                        : "flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
                    }
                  >
                    <span>{item}</span>
                    {index === 0 ? <CheckCircle2 className="size-4" /> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {sessionRows.map((row) => (
                <div key={row.label} className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <span className="text-xl font-semibold">{row.value}</span>
                    <span className={`h-8 w-2 rounded-full ${row.tone}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <p className="text-sm font-medium">Concept movement</p>
              </div>
              <div className="flex h-28 items-end gap-2">
                {[42, 58, 46, 74, 68, 88, 80].map((height, index) => (
                  <span
                    key={height + index}
                    className="flex-1 rounded-t-md bg-primary/80"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-background/70">
        <div className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
          {tracks.map((track) => {
            const Icon = track.icon;

            return (
              <Link
                key={track.title}
                href={track.href}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="mb-4 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold">{track.title}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{track.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Pulth</p>
          <Link href="/privacy" className="font-medium transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  );
}

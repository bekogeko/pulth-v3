import type { Metadata } from "next";
import { ArrowLeft, Brain } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service | Pulth",
  description: "The terms that apply when using Pulth.",
};

const sections = [
  {
    title: "Acceptance",
    body: [
      "By accessing or using Pulth, you agree to these Terms of Service and any policies referenced by them.",
      "If you use Pulth on behalf of an organization, you represent that you have authority to accept these terms for that organization.",
    ],
  },
  {
    title: "Use of Pulth",
    body: [
      "Pulth provides quiz, concept practice, article, ranking, and related learning features.",
      "You are responsible for the activity on your account and for keeping your sign-in credentials secure.",
      "You may not misuse Pulth, interfere with the service, attempt unauthorized access, scrape the product at scale, or use Pulth in a way that violates applicable law.",
    ],
  },
  {
    title: "Content and Learning Data",
    body: [
      "Pulth may include questions, explanations, rankings, articles, and other learning materials created or maintained through the product.",
      "When you submit answers, ratings, edits, or other content, you grant Pulth the right to use that content as needed to operate, protect, analyze, and improve the service.",
      "You are responsible for content you provide and must have the rights needed to provide it.",
    ],
  },
  {
    title: "Accounts",
    body: [
      "Some features require an account. We may suspend or restrict access if we believe an account is being used abusively, unlawfully, or in a way that creates risk for Pulth or other users.",
      "You may stop using Pulth at any time. Some account, ranking, or learning activity may be retained where needed for security, integrity, legal, or operational reasons.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "Pulth may rely on third-party providers for authentication, hosting, analytics, databases, infrastructure, diagnostics, and other operational needs.",
      "Your use of those connected services may also be governed by the providers' own terms and policies.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "Pulth is provided on an as-is and as-available basis. We do not guarantee that the service will be uninterrupted, error-free, or that all learning content will be complete or accurate.",
      "Pulth is a learning tool and should not be treated as professional, legal, financial, medical, or academic advice.",
    ],
  },
  {
    title: "Liability",
    body: [
      "To the fullest extent permitted by law, Pulth and its operators will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, goodwill, or other intangible losses.",
      "Where liability cannot be excluded, it will be limited to the maximum extent permitted by applicable law.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update these terms from time to time. When we make material changes, we will update the date on this page and provide additional notice when appropriate.",
      "Continued use of Pulth after changes become effective means you accept the updated terms.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,var(--background)_0%,var(--muted)_100%)] text-foreground">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Pulth home">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Brain className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide">Pulth</span>
        </Link>
        <Button asChild variant="outline" size="lg">
          <Link href="/">
            <ArrowLeft />
            Home
          </Link>
        </Button>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="space-y-4 border-b border-border pb-8">
          <p className="text-sm font-medium text-primary">Last updated: May 1, 2026</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
            Terms of Service
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            These terms explain the rules that apply when you access or use Pulth.
          </p>
        </section>

        <div className="divide-y divide-border">
          {sections.map((section) => (
            <section key={section.title} className="grid gap-4 py-8 md:grid-cols-[0.38fr_1fr]">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            For questions about these terms, contact Pulth at{" "}
            <a href="mailto:gulestanbekir@gmail.com" className="font-medium text-primary hover:underline">
              gulestanbekir@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

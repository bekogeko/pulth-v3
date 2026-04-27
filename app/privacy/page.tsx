import type { Metadata } from "next";
import { ArrowLeft, Brain } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy | Pulth",
  description: "How Pulth collects, uses, and protects personal information.",
};

const sections = [
  {
    title: "Information We Collect",
    body: [
      "Account information, such as your name, email address, profile details, and authentication identifiers provided through our sign-in provider.",
      "Learning activity, including quizzes you open, answers you submit, concept ratings, ranking activity, and progress signals generated while using Pulth.",
      "Technical and usage information, such as device, browser, session, diagnostic, and analytics events that help us understand performance and product usage.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "To provide the quiz, concept practice, ranking, and account features of Pulth.",
      "To personalize learning flows, maintain progress, calculate ratings, and improve the quality of questions and product workflows.",
      "To monitor reliability, prevent abuse, troubleshoot issues, and understand aggregate usage trends.",
    ],
  },
  {
    title: "Service Providers",
    body: [
      "Pulth may use third-party providers for authentication, analytics, hosting, storage, databases, and product diagnostics.",
      "These providers process information only as needed to support Pulth and are expected to protect information according to their own security and privacy commitments.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We keep personal information for as long as needed to provide Pulth, comply with legal obligations, resolve disputes, and maintain security.",
      "Learning activity may be retained to preserve quiz history, concept ratings, and ranking integrity unless deletion is requested or retention is no longer necessary.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You can choose not to provide certain information, but some account and learning features may not work without it.",
      "You may request access, correction, or deletion of personal information where applicable by contacting Pulth through the support channel available in the product.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable technical and organizational measures designed to protect personal information.",
      "No internet service can guarantee perfect security, so you should use a strong password and keep your account credentials private.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this policy from time to time. When we make material changes, we will update the date on this page and provide additional notice when appropriate.",
    ],
  },
];

export default function PrivacyPolicyPage() {
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
          <p className="text-sm font-medium text-primary">Last updated: April 27, 2026</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            This policy explains how Pulth collects, uses, and protects information when you use the product.
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
            For privacy questions or requests, contact Pulth at{" "}
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

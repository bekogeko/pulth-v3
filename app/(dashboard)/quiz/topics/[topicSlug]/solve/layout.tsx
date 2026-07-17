import type {ReactNode} from "react";
import {notFound} from "next/navigation";

import {getTopicBySlug} from "@/app/(dashboard)/quiz/quiz";

type SolveTopicLayoutProps = {
    children: ReactNode;
    params: Promise<{ topicSlug: string }>;
};

// Gate the topic lookup here, above the segment's loading.tsx Suspense boundary.
// Once that boundary streams, the response headers (200) are already flushed and
// a notFound() in page.tsx can only soft-404. Resolving the topic in the layout
// runs before streaming starts, so an invalid slug yields a real 404.
export default async function SolveTopicLayout({children, params}: SolveTopicLayoutProps) {
    const {topicSlug} = await params;
    const topic = await getTopicBySlug(topicSlug).then((results) => results[0]);

    if (!topic) {
        notFound();
    }

    return children;
}

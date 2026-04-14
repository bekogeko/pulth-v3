import {cn} from "@/lib/utils";

type QuestionBodyBlockProps = {
    body: string | null | undefined;
    className?: string;
};

export function QuestionBodyBlock({body, className}: QuestionBodyBlockProps) {
    if (!body) {
        return null;
    }

    return (
        <pre
            className={cn(
                "overflow-x-auto rounded-xl border border-border/70 bg-muted/30 px-4 py-3 font-mono text-xs leading-6 text-foreground whitespace-pre-wrap",
                className
            )}
        >
            <code>{body}</code>
        </pre>
    );
}

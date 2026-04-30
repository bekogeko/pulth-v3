import sanitizeHTML from "sanitize-html";

export default function InlineRenderer(props: { text: string }) {
    const cleanData = sanitizeHTML(props.text, {
        allowedTags: ["b", "i", "br", "a", "code"],
        allowedAttributes: {
            a: ["href", "target", "rel"],
        },
        allowedSchemes: ["http", "https", "mailto"],
        transformTags: {
            a: sanitizeHTML.simpleTransform(
                "a",
                {rel: "ugc nofollow noopener noreferrer", target: "_blank"},
                true,
            ),
        },
    });

    return (
        <span
            className="[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary/80 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]"
            dangerouslySetInnerHTML={{__html: cleanData}}
        />
    );
}

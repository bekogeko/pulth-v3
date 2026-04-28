import sanitizeHTML from "sanitize-html";

export default function InlineRenderer(props: { text: string }) {
    const cleanData = sanitizeHTML(props.text, {
        allowedTags: ["b", "i", "br", "a"],
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
            className="[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary/80"
            dangerouslySetInnerHTML={{__html: cleanData}}
        />
    );
}

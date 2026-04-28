import type {ReactNode} from "react";
import InlineRenderer from "@/app/articles/[slug]/InlineRenderer";
import ListRenderer from "@/app/articles/[slug]/ListRenderer";
import type {Block, EditorJsOutput, EditorListItem} from "@/schemas/EditorTypes";

function Header(props: { level: number; children: ReactNode }) {
    switch (props.level) {
        case 1:
            return <h1 className="mt-10 text-4xl font-semibold tracking-normal">{props.children}</h1>;
        case 2:
            return <h2 className="mt-9 text-3xl font-semibold tracking-normal">{props.children}</h2>;
        case 3:
            return <h3 className="mt-8 text-2xl font-semibold tracking-normal">{props.children}</h3>;
        case 4:
            return <h4 className="mt-7 text-xl font-semibold tracking-normal">{props.children}</h4>;
        case 5:
            return <h5 className="mt-6 text-lg font-semibold tracking-normal">{props.children}</h5>;
        case 6:
            return <h6 className="mt-5 text-base font-semibold tracking-normal">{props.children}</h6>;
        default:
            return <div>{props.children}</div>;
    }
}

function renderBlock(item: Block, index: number) {
    const key = item.id ?? `${item.type}-${index}`;
    const text = typeof item.data.text === "string" ? item.data.text : "";

    switch (item.type) {
        case "header":
            return (
                <Header key={key} level={typeof item.data.level === "number" ? item.data.level : 2}>
                    <InlineRenderer text={text}/>
                </Header>
            );
        case "paragraph":
            return (
                <p key={key} className="my-5 leading-8 text-foreground/90">
                    <InlineRenderer text={text}/>
                </p>
            );
        case "list":
            const items = Array.isArray(item.data.items) ? item.data.items as EditorListItem[] : [];

            return (
                <div key={key} className="my-5 leading-8 text-foreground/90">
                    <ListRenderer
                        style={typeof item.data.style === "string" ? item.data.style : "unordered"}
                        items={items}
                        meta={typeof item.data.meta === "object" && item.data.meta !== null ? item.data.meta as Record<string, unknown> : undefined}
                    />
                </div>
            );
        default:
            return (
                <pre className="my-5 overflow-x-auto rounded-md bg-destructive/10 p-4 text-sm text-destructive" key={key}>
                    Error unknown type: {JSON.stringify(item, null, 2)}
                </pre>
            );
    }
}

export default function ArticleRenderer(props: {
    title: string;
    description: string;
    body: EditorJsOutput;
}) {
    return (
        <article className="mx-auto max-w-2xl px-4 py-12">
            <header className="mb-10 border-b pb-8 text-center">
                <h1 className="text-4xl font-semibold tracking-normal">{props.title}</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground">{props.description}</p>
            </header>

            <div>
                {props.body.blocks.map(renderBlock)}
            </div>
        </article>
    );
}

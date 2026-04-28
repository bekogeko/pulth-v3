import InlineRenderer from "@/app/articles/[slug]/InlineRenderer";
import type {EditorListItem} from "@/schemas/EditorTypes";

function getItemText(item: EditorListItem) {
    return typeof item === "string" ? item : item.content ?? "";
}

function getNestedItems(item: EditorListItem) {
    return typeof item === "string" ? [] : item.items ?? [];
}

function RenderItems(props: { items: EditorListItem[]; ordered: boolean }) {
    const ListTag = props.ordered ? "ol" : "ul";

    return (
        <ListTag className={props.ordered ? "list-decimal pl-6" : "list-disc pl-6"}>
            {props.items.map((item, index) => {
                const nestedItems = getNestedItems(item);

                return (
                    <li key={`${getItemText(item)}-${index}`} className="my-1">
                        <InlineRenderer text={getItemText(item)}/>
                        {nestedItems.length > 0 && (
                            <RenderItems items={nestedItems} ordered={props.ordered}/>
                        )}
                    </li>
                );
            })}
        </ListTag>
    );
}

export default function ListRenderer(props: {
    style: string;
    items: EditorListItem[];
    meta?: Record<string, unknown>;
}) {
    return <RenderItems items={props.items} ordered={props.style === "ordered"}/>;
}

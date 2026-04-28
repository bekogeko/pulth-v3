export type EditorInlineText = {
    text: string;
};

export type EditorHeaderBlock = {
    id?: string;
    type: "header";
    data: EditorInlineText & {
        level: number;
    };
};

export type EditorParagraphBlock = {
    id?: string;
    type: "paragraph";
    data: EditorInlineText;
};

export type EditorListItem =
    | string
    | {
    content?: string;
    items?: EditorListItem[];
};

export type EditorListBlock = {
    id?: string;
    type: "list";
    data: {
        style: "ordered" | "unordered" | string;
        items: EditorListItem[];
        meta?: Record<string, unknown>;
    };
};

export type EditorUnknownBlock = {
    id?: string;
    type: string;
    data: Record<string, unknown>;
    tunes?: Record<string, unknown>;
};

export type KnownBlock = EditorHeaderBlock | EditorParagraphBlock | EditorListBlock;
export type Block = EditorUnknownBlock;

export type EditorJsOutput = {
    time?: number;
    blocks: Block[];
    version?: string;
};

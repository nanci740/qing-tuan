export type ForwardPayload = Record<string, unknown> | null;
export interface ForwardTarget {
    key: string;
    name: string;
    avatar: string;
    preview: string;
    lastTime: number;
    time: string;
}
export interface ForwardPickerServices {
    anchor: Comment;
    targets(): ForwardTarget[];
}
export interface ForwardPickerApi {
    open(payload: ForwardPayload): void;
    close(): void;
}

export type MessageAction = 'transcribe' | 'translate' | 'quote' | 'copy' | 'favorite' | 'forward' | 'multi' | 'pin' | 'edit' | 'recall' | 'delete';
export interface MessageInfo {
    user: boolean;
    voice: boolean;
    sentAt: number;
    favorite: boolean;
    pinned: boolean;
    transcript: boolean;
    editText: string;
    text: string;
    quote: string;
    id: string;
    recallContent: string;
    repliedAfter: boolean;
}
export interface MessageOperationsServices {
    read(row: HTMLElement): MessageInfo;
    id(row: HTMLElement): string;
    anchor(row: HTMLElement): {
        left: number;
        top: number;
        height: number;
    };
    selectLongPress(row: HTMLElement): boolean;
    suppressVoice(until: number): void;
    focusCompose(): void;
    favorite(row: HTMLElement, value: boolean): void;
    pin(row: HTMLElement, value: boolean): void;
    selection(row: HTMLElement): void;
    forward(row: HTMLElement): void;
    transcribe(row: HTMLElement): Promise<unknown>;
    translate(row: HTMLElement): Promise<unknown>;
    toggleTranscript(row: HTMLElement): boolean;
    sharedConfirm(): boolean;
    remove(rows: HTMLElement[], fromSelection: boolean): void;
    edit(row: HTMLElement, value: string, before: string, changed: boolean): void;
    finishRecall(): void;
    recall(row: HTMLElement, data: {
        content: string;
        seen: boolean;
        sentAt: number;
    }): void;
}
export interface MessageOperationsApi {
    openMenu(row: HTMLElement): void;
    closeMenu(): void;
    closeEdit(): void;
    quote(): {
        text: string;
        targetId: string;
    };
    clearQuote(): void;
    setQuote(row: HTMLElement): void;
    deleteRows(rows: HTMLElement[], fromSelection?: boolean): Promise<void>;
    copy(text: string): Promise<void>;
}

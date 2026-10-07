import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, PointerEvent, MouseEvent, RefObject } from 'react';
import { flushSync } from 'react-dom';
import { confirmChat } from '../utils/chatConfirm';
import { showToast } from '../utils/toast';
import type { MessageAction, MessageOperationsApi, MessageOperationsServices, MessageInfo } from '../types/chatMessageOperations';
const initial = { menuHidden: true, menuRecallable: false, menuInfo: null as MessageInfo | null, left: undefined as string | undefined, top: undefined as string | undefined, editHidden: true, recallHidden: true, deleteHidden: true, deleteDescription: '确定删除这条消息吗？', quoteText: '', editDraft: '', clipboard: null as string | null };
function canRecall(info: MessageInfo | null) { const elapsed = Date.now() - (info?.sentAt ?? 0); return Boolean(info?.user && info.sentAt > 0 && Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 2 * 60 * 1000); }
function errorMessage(error: unknown) { const e = error as Error; return e?.name === 'AbortError' ? '已取消' : String(e?.message || '请求失败').slice(0, 150); }
interface OperationsContext {
    view: typeof initial;
    panel: RefObject<HTMLDivElement | null>;
    editInput: RefObject<HTMLTextAreaElement | null>;
    clipboardInput: RefObject<HTMLTextAreaElement | null>;
    openMenu(row: HTMLElement): void;
    closeMenu(): void;
    action(action: MessageAction): Promise<void>;
    closeEdit(): void;
    saveEdit(): void;
    edit(value: string): void;
    closeRecall(): void;
    recall(): void;
    closeDelete(): void;
    remove(): void;
    clearQuote(): void;
    pointerDown(event: PointerEvent<HTMLDivElement>): void;
    pointerMove(event: PointerEvent<HTMLDivElement>): void;
    cancelLongPress(): void;
    contextMenu(event: MouseEvent<HTMLDivElement>): void;
}
const Context = createContext<OperationsContext | null>(null);
export function ChatMessageOperationsProvider({ children }: {
    children: ReactNode;
}) {
    const [view, setView] = useState(initial), live = useRef(view), ready = useRef(false), services = useRef<MessageOperationsServices | null>(null);
    const panel = useRef<HTMLDivElement | null>(null), editInput = useRef<HTMLTextAreaElement | null>(null), clipboardInput = useRef<HTMLTextAreaElement | null>(null);
    const active = useRef<HTMLElement | null>(null), editing = useRef<HTMLElement | null>(null), recalling = useRef<HTMLElement | null>(null), deleting = useRef<{
        rows: HTMLElement[];
        fromSelection: boolean;
    }>({ rows: [], fromSelection: false }), quote = useRef({ text: '', targetId: '' });
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null), start = useRef({ x: 0, y: 0 }), frames = useRef(new Set<number>());
    function update(patch: Partial<typeof initial>) { live.current = { ...live.current, ...patch }; if (ready.current)
        flushSync(() => setView(live.current));
    else
        setView(live.current); }
    function frame(callback: () => void) { const id = requestAnimationFrame(() => { frames.current.delete(id); callback(); }); frames.current.add(id); }
    useEffect(() => { ready.current = true; return () => { ready.current = false; cancelLongPress(); for (const id of frames.current)
        cancelAnimationFrame(id); }; }, []);
    useLayoutEffect(() => { const connect = (event: Event) => { const detail = (event as CustomEvent<{
        services: MessageOperationsServices;
        accept(api: MessageOperationsApi): void;
    }>).detail; services.current = detail.services; detail.accept({ openMenu, closeMenu, closeEdit, quote: () => quote.current, clearQuote, setQuote, deleteRows, copy }); }; window.addEventListener('qingtuan:message-operations-connect', connect); return () => window.removeEventListener('qingtuan:message-operations-connect', connect); }, []);
    useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key !== 'Escape')
        return; if (!live.current.deleteHidden) {
        event.preventDefault();
        closeDelete();
    } if (!live.current.recallHidden) {
        event.preventDefault();
        closeRecall();
    } if (!live.current.editHidden) {
        event.preventDefault();
        closeEdit();
    } if (!live.current.menuHidden)
        closeMenu(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, []);
    function closeMenu() { update({ menuHidden: true }); active.current = null; }
    function openMenu(row: HTMLElement) {
        const service = services.current;
        if (!service)
            return;
        if (service.selectLongPress(row))
            return;
        active.current = row;
        const info = service.read(row);
        update({ menuInfo: info, menuRecallable: canRecall(info), menuHidden: false }); // 上下：选单中线对齐讯息中线；太上面就往下挪、太下面就往上挪，都留 8px
        frame(() => { if (!panel.current)
            return; const anchor = service.anchor(row), rect = panel.current.getBoundingClientRect(); update({ left: `${Math.min(window.innerWidth - rect.width - 8, Math.max(8, anchor.left + 8))}px`, top: `${Math.min(window.innerHeight - rect.height - 8, Math.max(8, anchor.top + anchor.height / 2 - rect.height / 2))}px` }); });
    }
    function cancelLongPress() { if (timer.current)
        clearTimeout(timer.current); timer.current = null; }
    function pointerDown(event: PointerEvent<HTMLDivElement>) { if (event.pointerType === 'mouse' && event.button !== 0)
        return; const row = (event.target as Element).closest<HTMLElement>('.chat-message-row'); if (!row)
        return; start.current = { x: event.clientX, y: event.clientY }; cancelLongPress(); timer.current = setTimeout(() => { services.current?.suppressVoice(Date.now() + 650); openMenu(row); }, 480); }
    function pointerMove(event: PointerEvent<HTMLDivElement>) { if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8)
        cancelLongPress(); }
    function contextMenu(event: MouseEvent<HTMLDivElement>) { const row = (event.target as Element).closest<HTMLElement>('.chat-message-row'); if (!row)
        return; event.preventDefault(); openMenu(row); }
    function clearQuote() { quote.current = { text: '', targetId: '' }; update({ quoteText: '' }); }
    function setQuote(row: HTMLElement) { const info = services.current!.read(row); quote.current = { text: info.quote, targetId: services.current!.id(row) }; update({ quoteText: info.quote }); services.current!.focusCompose(); }
    async function copy(text: string) { if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    } update({ clipboard: text }); clipboardInput.current!.select(); const copied = document.execCommand('copy'); update({ clipboard: null }); if (!copied)
        throw new Error('复制失败'); }
    function closeEdit() { update({ editHidden: true }); editing.current = null; }
    function openEdit(row: HTMLElement) { const info = services.current!.read(row); editing.current = row; update({ editHidden: false, editDraft: info.editText }); if (editInput.current)
        editInput.current.value = info.editText; frame(() => { editInput.current?.focus(); const size = editInput.current?.value.length ?? 0; editInput.current?.setSelectionRange(size, size); }); }
    function saveEdit() { const row = editing.current; if (!row || !editInput.current)
        return; const updated = editInput.current.value.trim(); if (!updated) {
        editInput.current.focus();
        return;
    } const before = services.current!.read(row).editText.trim(); services.current!.edit(row, updated, before, before !== updated); closeEdit(); showToast('已编辑'); }
    function closeRecall() { update({ recallHidden: true }); recalling.current = null; }
    function openRecall(row: HTMLElement) { if (!canRecall(services.current!.read(row))) {
        showToast('只能撤回发送后两分钟内的消息');
        return;
    } recalling.current = row; update({ recallHidden: false }); }
    function recall() { const row = recalling.current, info = row ? services.current!.read(row) : null; if (!canRecall(info)) {
        closeRecall();
        showToast('已超过两分钟，无法撤回');
        return;
    } services.current!.recall(row!, { content: info!.recallContent, seen: info!.repliedAfter || Math.random() < 0.4, sentAt: Date.now() }); closeRecall(); services.current!.finishRecall(); showToast('已撤回'); }
    function closeDelete() { update({ deleteHidden: true }); deleting.current = { rows: [], fromSelection: false }; }
    function remove() { const { rows, fromSelection } = deleting.current; closeDelete(); services.current!.remove(rows.slice(), fromSelection); showToast('已删除'); }
    async function deleteRows(rows: HTMLElement[], fromSelection = false) { if (!rows?.length)
        return; deleting.current = { rows: rows.slice(), fromSelection }; const message = rows.length === 1 ? '确定删除这条消息吗？' : `确定删除选中的 ${rows.length} 条消息吗？`; if (services.current!.sharedConfirm()) {
        if (await confirmChat({ title: '删除消息', message, confirmText: '删除', danger: true }))
            remove();
        else
            closeDelete();
        return;
    } update({ deleteDescription: message, deleteHidden: false }); }
    async function action(action: MessageAction) { const row = active.current, service = services.current; if (!row || !service)
        return; closeMenu(); try {
        const info = service.read(row);
        switch (action) {
            case 'transcribe':
                if (info.transcript) {
                    showToast(service.toggleTranscript(row) ? '已展開轉文字' : '已收起轉文字');
                }
                else {
                    showToast('正在转文字…');
                    await service.transcribe(row);
                    showToast('已转成文字');
                }
                break;
            case 'translate':
                showToast('正在翻译成简体中文…');
                await service.translate(row);
                showToast('翻译完成');
                break;
            case 'quote':
                setQuote(row);
                break;
            case 'copy':
                await copy(info.text || info.quote);
                showToast('已复制');
                break;
            case 'favorite':
                service.favorite(row, !info.favorite);
                showToast(!info.favorite ? '已收藏' : '已取消收藏');
                break;
            case 'pin':
                service.pin(row, !info.pinned);
                showToast(!info.pinned ? '已置顶' : '已取消置顶');
                break;
            case 'multi':
                service.selection(row);
                break;
            case 'forward':
                service.forward(row);
                break;
            case 'edit':
                openEdit(row);
                break;
            case 'recall':
                openRecall(row);
                break;
            case 'delete':
                void deleteRows([row]);
                break;
        }
    }
    catch (error) {
        showToast(errorMessage(error));
    } }
    return <Context.Provider value={{ view, panel, editInput, clipboardInput, openMenu, closeMenu, action, closeEdit, saveEdit, edit: value => update({ editDraft: value }), closeRecall, recall, closeDelete, remove, clearQuote, pointerDown, pointerMove, cancelLongPress, contextMenu }}>{children}</Context.Provider>;
}
export function useMessageOperations() { const state = useContext(Context); if (!state)
    throw new Error('ChatMessageOperationsProvider is required'); return state; }
export { canRecall };

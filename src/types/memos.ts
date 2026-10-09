export type MemoKind = 'text' | 'checklist';
export type MemoPaper = 'plain' | 'lined';
export type MemoFolder = 'all' | 'pinned' | 'trash';

export interface MemoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface MemoNote {
  id: string;
  title: string;
  body: string;
  kind: MemoKind;
  paper: MemoPaper;
  items: MemoItem[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

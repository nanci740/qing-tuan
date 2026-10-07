export interface ChatCharacterActionSelection {
  id: string;
  name: string;
  pinned: boolean;
  favorite: boolean;
  x?: number;
  y?: number;
}
export interface ChatCharacterActionsServices {
  read: (id: string) => {
    pinned: boolean;
    favorite: boolean;
  } | null;
  patch: (id: string, fields: {
    pinned?: boolean;
    favorite?: boolean;
  }) => void;
  remove: (id: string) => Promise<void>;
}
export interface ChatConfirmationOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
export interface ChatConfirmationRequest {
  options: ChatConfirmationOptions;
  resolve: (accepted: boolean) => void;
}

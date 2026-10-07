import { EditableText } from '../../components/shared/EditableText';
import { useProfileText } from '../../hooks/usePersonalProfile';
import type { HTMLAttributes } from 'react';
export function ProfileText({ storageKey, fallback = '', ...props }: HTMLAttributes<HTMLElement> & { storageKey: string; fallback?: string; as?: 'span' | 'div'; emptyClass?: string; singleLinePaste?: boolean }) {
 const [value, change] = useProfileText(storageKey, fallback);
 return <EditableText {...props} value={value} onChange={change} />;
}

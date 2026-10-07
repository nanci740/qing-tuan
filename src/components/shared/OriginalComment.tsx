import { useCallback } from 'react';

/** Keep original comment nodes without adding permanent elements to the DOM. */
export function OriginalComment({ text }: { readonly text: string }) {
  const restoreComment = useCallback((element: HTMLTemplateElement | null): void => {
    if (element) element.replaceWith(document.createComment(text));
  }, [text]);
  return <template ref={restoreComment} />;
}

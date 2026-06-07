import type { RefObject } from 'react';

let documentRelativePathRef: RefObject<string | null | undefined> = {
  current: null,
};

export function bindWysiwygDocumentRelativePathRef(
  ref: RefObject<string | null | undefined>,
): void {
  documentRelativePathRef = ref;
}

export function getWysiwygDocumentRelativePath(): string | null | undefined {
  return documentRelativePathRef.current;
}

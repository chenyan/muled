export type StatusToastKind = 'info' | 'success' | 'error';

export interface StatusToastMessage {
  id: string;
  message: string;
  kind: StatusToastKind;
}

type Listener = (toast: StatusToastMessage) => void;

let listener: Listener | null = null;

export function subscribeStatusToast(fn: Listener | null): void {
  listener = fn;
}

export function pushStatusToast(
  message: string,
  kind: StatusToastKind = 'info',
): void {
  listener?.({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    kind,
  });
}

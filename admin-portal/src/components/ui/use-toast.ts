'use client';
import * as React from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  open?: boolean;
}

interface ToastState {
  toasts: Toast[];
}

type Action =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; toastId: string }
  | { type: 'REMOVE_TOAST'; toastId: string };

const TOAST_REMOVE_DELAY = 3000;

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return { toasts: [action.toast, ...state.toasts].slice(0, 5) };
    case 'DISMISS_TOAST':
      return { toasts: state.toasts.map((t) => (t.id === action.toastId ? { ...t, open: false } : t)) };
    case 'REMOVE_TOAST':
      return { toasts: state.toasts.filter((t) => t.id !== action.toastId) };
  }
}

export function toast({ title, description, variant = 'default' }: Omit<Toast, 'id' | 'open'>) {
  const id = String(Date.now());
  dispatch({ type: 'ADD_TOAST', toast: { id, title, description, variant, open: true } });
  const timeout = setTimeout(() => {
    dispatch({ type: 'DISMISS_TOAST', toastId: id });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', toastId: id }), 300);
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(id, timeout);
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);
  return { toasts: state.toasts, toast };
}

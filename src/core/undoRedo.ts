import { useCallback, useRef } from 'react';

interface HistoryEntry<T> {
  past: T[];
  future: T[];
}

export function useUndoRedo<T>(initial: T) {
  const history = useRef<HistoryEntry<T>>({ past: [], future: [] });
  const current = useRef<T>(initial);

  const push = useCallback((state: T) => {
    history.current.past.push(current.current);
    if (history.current.past.length > 50) history.current.past.shift();
    history.current.future = [];
    current.current = state;
  }, []);

  const undo = useCallback((): T | null => {
    const prev = history.current.past.pop();
    if (prev === undefined) return null;
    history.current.future.push(current.current);
    current.current = prev;
    return prev;
  }, []);

  const redo = useCallback((): T | null => {
    const next = history.current.future.pop();
    if (next === undefined) return null;
    history.current.past.push(current.current);
    current.current = next;
    return next;
  }, []);

  const canUndo = history.current.past.length > 0;
  const canRedo = history.current.future.length > 0;

  return { push, undo, redo, canUndo, canRedo };
}

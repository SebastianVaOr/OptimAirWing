import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'optimairwing-autosave';
const DEBOUNCE_MS = 2000;

export function useAutoSave(data: unknown) {
  const saved = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        saved.current = true;
      } catch { /* storage full */ }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [data]);
}

export function loadAutoSave<T>(): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAutoSave() {
  localStorage.removeItem(STORAGE_KEY);
}

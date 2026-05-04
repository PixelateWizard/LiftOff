import { useCallback, useState } from "react";

type SetStateAction<T> = T | ((prev: T) => T);

export function usePersistentJson<T>(key: string, initialValue: T) {
  const [value, setValueState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((nextValue: SetStateAction<T>) => {
    setValueState(prev => {
      const resolved = typeof nextValue === "function"
        ? (nextValue as (prev: T) => T)(prev)
        : nextValue;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {}
      return resolved;
    });
  }, [key]);

  return [value, setValue] as const;
}

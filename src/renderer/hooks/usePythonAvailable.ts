import { useEffect, useState } from 'react';

export function usePythonAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (!window.muled?.python?.available) {
        if (!cancelled) setAvailable(false);
        return;
      }
      try {
        const result = await window.muled.python.available();
        if (!cancelled) setAvailable(Boolean(result.available));
      } catch {
        if (!cancelled) setAvailable(false);
      }
    };

    void refresh();
    const unsub = window.muled?.config?.onConfigChanged?.(() => {
      void refresh();
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  return available;
}

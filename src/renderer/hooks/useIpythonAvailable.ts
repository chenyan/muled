import { useEffect, useState } from 'react';

export function useIpythonAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (!window.muled?.python?.ipythonAvailable) {
        if (!cancelled) setAvailable(false);
        return;
      }
      try {
        const result = await window.muled.python.ipythonAvailable();
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

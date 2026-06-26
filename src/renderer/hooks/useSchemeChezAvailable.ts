import { useEffect, useState } from 'react';

/** Chez Scheme 是否已配置且可执行（含 PATH 自动检测） */
export function useSchemeChezAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (!window.muled?.scheme?.available) {
        if (!cancelled) setAvailable(false);
        return;
      }
      try {
        const result = await window.muled.scheme.available();
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

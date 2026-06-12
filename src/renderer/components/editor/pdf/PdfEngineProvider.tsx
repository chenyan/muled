import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import type { PdfEngine } from '@embedpdf/models';
import { resolvePdfiumWasmUrl } from '../../../lib/pdfWasm';

/** 应用启动后延迟预加载 PDF 引擎，避免阻塞首屏 */
const PDF_ENGINE_PRELOAD_DELAY_MS = 1200;

interface PdfEngineContextValue {
  engine: PdfEngine<Blob> | null;
  isLoading: boolean;
  error: Error | null;
}

const PdfEngineContext = createContext<PdfEngineContextValue>({
  engine: null,
  isLoading: false,
  error: null,
});

export function usePdfEngine(): PdfEngineContextValue {
  return useContext(PdfEngineContext);
}

interface PdfEngineProviderProps {
  children: ReactNode;
}

function PdfEngineLoader({ children }: PdfEngineProviderProps) {
  const { engine, isLoading, error } = usePdfiumEngine({
    wasmUrl: resolvePdfiumWasmUrl(),
    // Electron 下 EmbedPDF blob/module Worker 与 Webpack worker chunk 均不稳定，使用主线程 direct 模式
    worker: false,
  });

  const value = useMemo(
    () => ({ engine, isLoading, error }),
    [engine, isLoading, error],
  );

  return (
    <PdfEngineContext.Provider value={value}>
      {children}
    </PdfEngineContext.Provider>
  );
}

export default function PdfEngineProvider({ children }: PdfEngineProviderProps) {
  const [preloadReady, setPreloadReady] = useState(false);

  useEffect(() => {
    const start = () => setPreloadReady(true);
    if (typeof requestIdleCallback === 'function') {
      const idleId = requestIdleCallback(start, { timeout: PDF_ENGINE_PRELOAD_DELAY_MS });
      return () => cancelIdleCallback(idleId);
    }
    const timerId = window.setTimeout(start, PDF_ENGINE_PRELOAD_DELAY_MS);
    return () => window.clearTimeout(timerId);
  }, []);

  if (!preloadReady) {
    return (
      <PdfEngineContext.Provider
        value={{ engine: null, isLoading: true, error: null }}
      >
        {children}
      </PdfEngineContext.Provider>
    );
  }

  return <PdfEngineLoader>{children}</PdfEngineLoader>;
}

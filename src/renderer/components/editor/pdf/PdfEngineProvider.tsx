import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import type { PdfEngine } from '@embedpdf/models';
import { PDFIUM_WASM_URL } from '../../../lib/pdfWasm';

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

export default function PdfEngineProvider({ children }: PdfEngineProviderProps) {
  const { engine, isLoading, error } = usePdfiumEngine({
    wasmUrl: PDFIUM_WASM_URL,
    // Electron CSP (index.ejs) 仅允许 script-src 'self'；默认 worker:true 会用 blob: Worker 并被拦截
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

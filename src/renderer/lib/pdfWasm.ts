import pdfiumWasmUrl from '@embedpdf/pdfium/pdfium.wasm';

export const PDFIUM_WASM_URL = pdfiumWasmUrl;

/** Webpack 资源 URL → 绝对 URL，避免 fetch 时相对路径解析失败 */
export function resolvePdfiumWasmUrl(): string {
  return new URL(pdfiumWasmUrl, window.location.href).href;
}

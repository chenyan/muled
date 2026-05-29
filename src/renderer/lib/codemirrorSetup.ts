import type { Extension } from '@codemirror/state';
import { basicLight } from 'cm6-theme-basic-light';
import { basicSetup } from 'codemirror';

/** 将 CodeMirror 扩展或扩展数组合并为一维数组，过滤 undefined */
export function flattenExtensions(
  parts: Array<Extension | readonly Extension[] | undefined | null>,
): Extension[] {
  return parts.reduce<Extension[]>((acc, part) => {
    if (part == null) return acc;
    if (Array.isArray(part)) return acc.concat([...part]);
    return acc.concat([part]);
  }, []);
}

/** Source 编辑器通用 UI 扩展（主题、行号等） */
export function buildCommonSourceUiExtensions(): Extension[] {
  return flattenExtensions([basicSetup, basicLight]);
}

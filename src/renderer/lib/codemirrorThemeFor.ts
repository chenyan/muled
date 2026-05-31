import { basicDark } from 'cm6-theme-basic-dark';
import { basicLight } from 'cm6-theme-basic-light';
import type { Extension } from '@codemirror/state';
import type { ResolvedTheme } from '../../shared/types/theme';
import { acmeCodeMirrorTheme } from './codemirrorAcmeTheme';

export function codeMirrorThemeFor(
  theme: ResolvedTheme,
): Extension | readonly Extension[] {
  if (theme === 'dark') return basicDark;
  if (theme === 'acme') return acmeCodeMirrorTheme;
  return basicLight;
}

import { cpp } from '@codemirror/lang-cpp';
import { css } from '@codemirror/lang-css';
import { go } from '@codemirror/lang-go';
import { html } from '@codemirror/lang-html';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { less } from '@codemirror/lang-less';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { sass } from '@codemirror/lang-sass';
import { sql } from '@codemirror/lang-sql';
import { vue } from '@codemirror/lang-vue';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import type { Extension } from '@codemirror/state';
import type { SourceLanguageId } from './fileLanguage';

export default function languageExtensionForId(
  id: SourceLanguageId,
): Extension | null {
  switch (id) {
    case 'markdown':
      return markdown();
    case 'javascript':
      return javascript();
    case 'typescript':
      return javascript({ typescript: true });
    case 'jsx':
      return javascript({ jsx: true });
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'json':
      return json();
    case 'yaml':
      return yaml();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'sass':
      return sass({ indented: false });
    case 'less':
      return less();
    case 'python':
      return python();
    case 'rust':
      return rust();
    case 'go':
      return go();
    case 'java':
      return java();
    case 'sql':
      return sql();
    case 'xml':
      return xml();
    case 'php':
      return php();
    case 'cpp':
      return cpp();
    case 'vue':
      return vue();
    case 'plain':
    default:
      return null;
  }
}

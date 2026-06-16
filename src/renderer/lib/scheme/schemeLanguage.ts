import {
  foldInside,
  foldNodeProp,
  LRLanguage,
  LanguageSupport,
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { parser } from './lezer-scheme/parser.js';
import { schemeIndentNodeProp, schemeIndentServiceExtension } from './schemeIndent';
import schemeRainbowParens from './schemeRainbowParens';
import './schemeRainbowParens.css';

const schemeParser = parser.configure({
  props: [
    styleTags({
      LineComment: t.lineComment,
      BlockCommentText: t.blockComment,
      BooleanToken: t.bool,
      Number: t.number,
      String: t.string,
      Character: t.character,
      Symbol: t.variableName,
      Keyword: t.labelName,
      LangLine: t.meta,
      ShebangLine: t.meta,
    }),
    schemeIndentNodeProp,
    foldNodeProp.add((type) => {
      if (
        type.name === 'List' ||
        type.name === 'SquareList' ||
        type.name === 'CurlyList' ||
        type.name === 'Vector' ||
        type.name === 'ByteVector'
      ) {
        return foldInside;
      }
      return undefined;
    }),
  ],
});

const schemeLanguageDefinition = LRLanguage.define({
  name: 'scheme',
  parser: schemeParser,
  languageData: {
    commentTokens: {
      line: ';',
      block: { open: '#|', close: '|#' },
    },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
    indentOnInput: /^\s*([)\]}]|$)/,
  },
});

export default function schemeLanguage(): LanguageSupport {
  return new LanguageSupport(schemeLanguageDefinition, [
    schemeRainbowParens(),
    schemeIndentServiceExtension,
  ]);
}

export { schemeLanguageDefinition };

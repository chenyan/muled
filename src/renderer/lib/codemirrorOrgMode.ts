import { StreamLanguage } from '@codemirror/language';
import type { StreamParser, StringStream } from '@codemirror/language';

interface OrgState {
  inBlock: 'src' | 'example' | null;
}

const orgModeParser: StreamParser<OrgState> = {
  startState() {
    return { inBlock: null };
  },
  copyState(state) {
    return { inBlock: state.inBlock };
  },
  token(stream: StringStream, state: OrgState): string | null {
    if (state.inBlock === 'src') {
      if (stream.sol() && stream.match(/^#\+end_src/i)) {
        state.inBlock = null;
        return 'meta';
      }
      stream.skipToEnd();
      return 'comment';
    }

    if (state.inBlock === 'example') {
      if (stream.sol() && stream.match(/^#\+end_example/i)) {
        state.inBlock = null;
        return 'meta';
      }
      stream.skipToEnd();
      return 'string';
    }

    if (stream.sol()) {
      if (stream.match(/^#\+begin_src/i)) {
        state.inBlock = 'src';
        return 'meta';
      }
      if (stream.match(/^#\+end_src/i)) return 'meta';
      if (stream.match(/^#\+begin_example/i)) {
        state.inBlock = 'example';
        return 'meta';
      }
      if (stream.match(/^#\+end_example/i)) return 'meta';
      if (stream.match(/^#\+[\w_]+(?::.*)?$/)) {
        stream.skipToEnd();
        return 'meta';
      }
      if (stream.match(/^(\*+)\s/)) {
        stream.skipToEnd();
        return 'heading';
      }
      if (stream.match(/^:[A-Z][A-Z_]*:/)) {
        stream.skipToEnd();
        return 'keyword';
      }
      if (stream.match(/^#\s/)) {
        stream.skipToEnd();
        return 'comment';
      }
      if (stream.match(/^(\s*)([-+]|\d+\.)\s/)) {
        stream.skipToEnd();
        return 'keyword';
      }
      if (stream.match(/^-{5,}$/)) {
        stream.skipToEnd();
        return 'meta';
      }
    }

    if (stream.match(/=[^=\n]+=/)) return 'string';
    if (stream.match(/~[^~\n]+~/)) return 'atom';
    if (stream.match(/\*[^*\n]+\*/)) return 'strong';
    if (stream.match(/\/[^/\n]+\//)) return 'emphasis';
    if (stream.match(/\+[^+\n]+\+/)) return 'strikethrough';
    if (stream.match(/_[^_\n]+_/)) return 'emphasis';
    if (stream.match(/\[\[[^\]]+\]\]/)) return 'link';

    stream.next();
    return null;
  },
};

export default function orgMode() {
  return StreamLanguage.define(orgModeParser);
}

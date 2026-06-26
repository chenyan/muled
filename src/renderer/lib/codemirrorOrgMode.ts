import { StreamLanguage } from '@codemirror/language';
import type { StreamParser, StringStream } from '@codemirror/language';

interface OrgState {
  inBlock: 'src' | 'example' | 'greater' | 'drawer' | 'comment' | null;
}

const ORG_TODO_KEYWORDS =
  /^(TODO|DONE|WAITING|NEXT|HOLD|CANCELLED|CANCELED|DEFERRED)\s/;

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

    if (state.inBlock === 'comment') {
      if (stream.sol() && stream.match(/^#\+end_comment/i)) {
        state.inBlock = null;
        return 'meta';
      }
      stream.skipToEnd();
      return 'comment';
    }

    if (state.inBlock === 'greater') {
      if (stream.sol() && stream.match(/^#\+end_\w+/i)) {
        state.inBlock = null;
        return 'meta';
      }
      stream.skipToEnd();
      return 'string';
    }

    if (state.inBlock === 'drawer') {
      if (stream.sol() && stream.match(/^:end:/i)) {
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
      if (stream.match(/^#\+begin_comment/i)) {
        state.inBlock = 'comment';
        return 'meta';
      }
      if (stream.match(/^#\+end_comment/i)) return 'meta';
      if (stream.match(/^#\+begin_\w+/i)) {
        state.inBlock = 'greater';
        return 'meta';
      }
      if (stream.match(/^#\+end_\w+/i)) return 'meta';
      if (stream.match(/^#\+[\w_]+(?::.*)?$/)) {
        stream.skipToEnd();
        return 'meta';
      }
      if (stream.match(/^(\*+)\s/)) {
        stream.skipToEnd();
        return 'heading';
      }
      if (stream.match(/^:([\w-]+):$/)) {
        const name = stream.current().slice(1, -1).toLowerCase();
        if (name !== 'end') {
          state.inBlock = 'drawer';
        }
        stream.skipToEnd();
        return 'keyword';
      }
      if (stream.match(/^(SCHEDULED|DEADLINE|CLOSED):/)) {
        stream.skipToEnd();
        return 'meta';
      }
      if (stream.match(/^#\s/)) {
        stream.skipToEnd();
        return 'comment';
      }
      if (stream.match(/^(\s*)([-+]|\d+\.)\s/)) {
        stream.skipToEnd();
        return 'keyword';
      }
      if (stream.match(/^\[fn:[^\]]+\]/)) {
        stream.skipToEnd();
        return 'meta';
      }
      if (stream.match(/^-{5,}$/)) {
        stream.skipToEnd();
        return 'meta';
      }
    }

    if (stream.match(/<[^>\n]+>/)) return 'number';
    if (stream.match(/=[^=\n]+=/)) return 'string';
    if (stream.match(/~[^~\n]+~/)) return 'atom';
    if (stream.match(/\*[^*\n]+\*/)) return 'strong';
    if (stream.match(/\/[^/\n]+\//)) return 'emphasis';
    if (stream.match(/\+[^+\n]+\+/)) return 'strikethrough';
    if (stream.match(/_[^_\n]+_/)) return 'emphasis';
    if (stream.match(/\[\[[^\]]+\]\]/)) return 'link';
    if (stream.match(ORG_TODO_KEYWORDS)) return 'meta';

    stream.next();
    return null;
  },
};

export default function orgMode() {
  return StreamLanguage.define(orgModeParser);
}

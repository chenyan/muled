const React = require('react');

function FileTree() {
  return React.createElement('div', { 'data-testid': 'file-tree' });
}

function useFileTree() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    model: {
      resetPaths: () => {},
      add: () => {},
      remove: () => {},
      move: () => {},
      batch: () => {},
      getSelectedPaths: () => [],
      getItem: () => null,
      scrollToPath: () => {},
      startRenaming: () => true,
      onMutation: (type: string, handler: (event: unknown) => void) => {
        const set = listeners.get(type) ?? new Set();
        set.add(handler);
        listeners.set(type, set);
        return () => {
          set.delete(handler);
        };
      },
      subscribe: () => () => undefined,
    },
  };
}

module.exports = { FileTree, useFileTree };

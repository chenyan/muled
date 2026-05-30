const React = require('react');

function FileTree() {
  return React.createElement('div', { 'data-testid': 'file-tree' });
}

function useFileTree() {
  return {
    model: {
      resetPaths: () => {},
      getSelectedPaths: () => [],
      getItem: () => null,
      scrollToPath: () => {},
    },
  };
}

module.exports = { FileTree, useFileTree };

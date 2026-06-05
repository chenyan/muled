/* eslint-disable react/prop-types */
const React = require('react');

const DocxEditor = React.forwardRef(function MockDocxEditor(_props, ref) {
  React.useImperativeHandle(ref, () => ({
    save: async () => new ArrayBuffer(0),
    getDocument: () => null,
    focus: () => {},
  }));

  return React.createElement('div', { 'data-testid': 'docx-editor' });
});

module.exports = {
  DocxEditor,
  createEmptyDocument: () => ({}),
  createDocumentWithText: () => ({}),
  renderAsync: async () => ({
    save: async () => new ArrayBuffer(0),
    destroy: () => {},
  }),
};

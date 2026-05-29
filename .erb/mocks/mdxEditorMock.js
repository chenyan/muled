/* eslint-disable react/prop-types */
const React = require('react');

const MarkdownEditor = React.forwardRef(function MockMDXEditor(props, ref) {
  React.useImperativeHandle(ref, () => ({
    getMarkdown: () => props.markdown ?? '',
    setMarkdown: () => {},
    insertMarkdown: () => {},
    focus: () => {},
    getContentEditableHTML: () => '',
    getSelectionMarkdown: () => '',
  }));

  return React.createElement('textarea', {
    'data-testid': 'mdx-editor',
    value: props.markdown ?? '',
    readOnly: props.readOnly,
    onChange: (e) => props.onChange?.(e.target.value),
  });
});

module.exports = {
  MDXEditor: MarkdownEditor,
  headingsPlugin: () => ({}),
  listsPlugin: () => ({}),
  quotePlugin: () => ({}),
  linkPlugin: () => ({}),
  imagePlugin: () => ({}),
  tablePlugin: () => ({}),
  thematicBreakPlugin: () => ({}),
  markdownShortcutPlugin: () => ({}),
  codeBlockPlugin: () => ({}),
  codeMirrorPlugin: () => ({}),
  diffSourcePlugin: () => ({}),
};

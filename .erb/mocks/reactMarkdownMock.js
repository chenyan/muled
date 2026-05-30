/* eslint-disable react/prop-types */
const React = require('react');

function ReactMarkdown({ children }) {
  return React.createElement(
    'div',
    { 'data-testid': 'react-markdown' },
    children,
  );
}

module.exports = {
  __esModule: true,
  default: ReactMarkdown,
};

import { createRoot } from 'react-dom/client';
import App from './App';

// ResizeObserver 在嵌套布局变更时可能抛出无害告警，避免 dev overlay 误报
const RESIZE_OBSERVER_LOOP = /ResizeObserver loop/i;

window.addEventListener(
  'error',
  (event) => {
    if (RESIZE_OBSERVER_LOOP.test(event.message ?? '')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);

const nativeConsoleError = window.console.error.bind(window.console);
window.console.error = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && RESIZE_OBSERVER_LOOP.test(first)) {
    return;
  }
  if (first instanceof Error && RESIZE_OBSERVER_LOOP.test(first.message)) {
    return;
  }
  nativeConsoleError(...args);
};

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);

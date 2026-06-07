import { createRoot } from 'react-dom/client';
import App from './App';

// ResizeObserver 在嵌套布局变更时可能抛出无害告警，避免 dev overlay 误报
window.addEventListener(
  'error',
  (event) => {
    if (
      event.message?.includes(
        'ResizeObserver loop completed with undelivered notifications',
      )
    ) {
      event.stopImmediatePropagation();
    }
  },
  true,
);

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);

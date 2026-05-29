import AppShell from './components/layout/AppShell';
import { WysiwygThemeProvider } from './hooks/useWysiwygStyles';
import './App.css';

export default function App() {
  return (
    <WysiwygThemeProvider>
      <AppShell />
    </WysiwygThemeProvider>
  );
}

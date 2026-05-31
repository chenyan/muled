import AppShell from './components/layout/AppShell';
import { AppThemeProvider } from './hooks/useAppTheme';
import './theme/uiTheme.css';
import './theme/acmeTheme.css';
import './App.css';

export default function App() {
  return (
    <AppThemeProvider>
      <AppShell />
    </AppThemeProvider>
  );
}

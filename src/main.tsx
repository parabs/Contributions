import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GmailAuthProvider } from './context/GmailAuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GmailAuthProvider>
      <App />
    </GmailAuthProvider>
  </StrictMode>,
);

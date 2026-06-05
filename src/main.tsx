import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './lib/i18n';
import App from './App.tsx';
import './index.css';
import { installFetchSlowdown } from './lib/devSlowdown';

installFetchSlowdown();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

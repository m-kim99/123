import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('모든 환경변수:', import.meta.env);
console.log('Gemini 키:', import.meta.env.VITE_GEMINI_API_KEY);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

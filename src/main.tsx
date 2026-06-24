import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: Service Worker registrieren (nur im Production-Build, damit der Dev-Server
// nicht von gecachten Assets gestört wird). Pfad relativ zur Base, damit es sowohl
// lokal als auch unter dem GitHub-Pages-Unterpfad /time-tracker/ funktioniert.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

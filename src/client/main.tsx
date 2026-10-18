import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Synchronize runtime client version per project rules
if (typeof window !== 'undefined') {
  (window as any).api = {
    ...((window as any).api || {}),
    appVersion: '1.2.1'
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

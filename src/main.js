import { mountApp } from './App.js';
const root = document.querySelector('#root');

if (!root) {
  throw new Error('Root element #root wurde nicht gefunden.');
}

mountApp(root);

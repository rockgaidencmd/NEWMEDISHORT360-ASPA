// auth.js — login con link mágico de Firebase Auth
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyApl919VrDKdV1AdHtZsrVYUC0zym-ZrZs',
  authDomain: 'medishort360-f6f20.firebaseapp.com',
  projectId: 'medishort360-f6f20',
  storageBucket: 'medishort360-f6f20.firebasestorage.app',
  messagingSenderId: '127659670697',
  appId: '1:127659670697:web:b845e760917ba77e253db8',
};

const app = initializeApp(firebaseConfig, 'ms360-auth');
export const authFb = getAuth(app);

const LS_EMAIL = 'ms360_email_login';

// Envía el link de acceso al email indicado.
export async function enviarLink(email) {
  const settings = {
    url: `${window.location.origin}/index.html`,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(authFb, email, settings);
  localStorage.setItem(LS_EMAIL, email);
}

// Si la URL actual es un link de acceso, completa el login. Devuelve el user o null.
export async function completarLinkSiAplica() {
  if (!isSignInWithEmailLink(authFb, window.location.href)) return null;
  let email = localStorage.getItem(LS_EMAIL);
  if (!email) email = window.prompt('Confirma tu email para entrar:');
  const cred = await signInWithEmailLink(authFb, email, window.location.href);
  localStorage.removeItem(LS_EMAIL);
  // Limpia el link de la URL.
  window.history.replaceState({}, document.title, '/index.html');
  return cred.user;
}

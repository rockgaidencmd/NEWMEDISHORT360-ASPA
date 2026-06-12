// api/_lib/firebase-admin.js — inicializa Firebase Admin una sola vez
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Las credenciales vienen de variables de entorno de Vercel (nunca del repo).
function init() {
  if (getApps().length) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // La clave privada se guarda con \n escapados en la variable de entorno.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

init();

export const db = getFirestore();
export const auth = getAuth();

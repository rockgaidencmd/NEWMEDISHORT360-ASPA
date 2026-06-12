// api/perfil.js — verifica el token, crea trial si es nuevo, devuelve estado
import { db, auth } from './_lib/firebase-admin.js';
import { CONFIG } from '../config.js';
import { nuevoTrial } from '../logica-acceso.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  // El token de Firebase llega en el header Authorization: Bearer <idToken>.
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!idToken) return res.status(401).json({ error: 'sin token' });

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'token inválido' });
  }

  const uid = decoded.uid;
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    // Usuario nuevo: se crea el trial en el servidor.
    const trial = nuevoTrial(CONFIG, Date.now());
    const perfil = {
      email: decoded.email || '',
      ...trial,
      paypal_sub_id: null,
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
    };
    await ref.set(perfil);
    return res.status(200).json(perfil);
  }

  return res.status(200).json(snap.data());
}

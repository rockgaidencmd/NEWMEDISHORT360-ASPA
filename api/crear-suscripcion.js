// api/crear-suscripcion.js — crea la suscripción en PayPal y devuelve el link
import { auth } from './_lib/firebase-admin.js';
import { paypalFetch } from './_lib/paypal.js';
import { CONFIG } from '../config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'token inválido' });
  }

  const { plan } = req.body || {};
  const def = CONFIG.PLANES[plan];
  if (!def) return res.status(400).json({ error: 'plan inválido' });

  const origin = req.headers.origin || `https://${req.headers.host}`;

  // custom_id lleva el uid para que el webhook sepa a quién activar.
  const sub = await paypalFetch('/v1/billing/subscriptions', {
    method: 'POST',
    body: {
      plan_id: def.paypal_plan_id,
      custom_id: decoded.uid,
      application_context: {
        brand_name: 'MEDISHORT360 ASPA',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${origin}/index.html?pago=ok`,
        cancel_url: `${origin}/index.html?pago=cancelado`,
      },
    },
  });

  const aprobar = (sub.links || []).find((l) => l.rel === 'approve');
  if (!aprobar) return res.status(502).json({ error: 'sin link de aprobación' });

  return res.status(200).json({ url: aprobar.href, sub_id: sub.id });
}

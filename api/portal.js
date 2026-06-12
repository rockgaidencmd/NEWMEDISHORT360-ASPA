// api/portal.js — devuelve el link donde el usuario gestiona su suscripción
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });

  // PayPal gestiona suscripciones desde la cuenta del usuario.
  const url = process.env.PAYPAL_ENV === 'live'
    ? 'https://www.paypal.com/myaccount/autopay/'
    : 'https://www.sandbox.paypal.com/myaccount/autopay/';

  return res.status(200).json({ url });
}

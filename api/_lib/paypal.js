// api/_lib/paypal.js — helpers REST de PayPal (token y verificación de webhook)

// Base URL según entorno: sandbox para pruebas, live para producción.
const BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Obtiene un access token OAuth2 (client_credentials).
export async function obtenerToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64');

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// Llamada REST genérica autenticada a PayPal.
export async function paypalFetch(path, { method = 'GET', body } = {}) {
  const token = await obtenerToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PayPal ${path} error: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// Verifica que un evento de webhook viene realmente de PayPal.
export async function verificarWebhook(headers, body) {
  const token = await obtenerToken();
  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return data.verification_status === 'SUCCESS';
}

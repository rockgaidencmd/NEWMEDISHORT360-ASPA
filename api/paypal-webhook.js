// api/paypal-webhook.js — recibe eventos de PayPal y actualiza Firestore
import { db } from './_lib/firebase-admin.js';
import { verificarWebhook } from './_lib/paypal.js';
import { CONFIG } from '../config.js';
import { calcularAccesoHasta } from '../logica-acceso.js';

// Resuelve el plan (mensual/anual) a partir del plan_id de PayPal.
function planDesdePayPal(planId) {
  const entrada = Object.entries(CONFIG.PLANES).find(
    ([, def]) => def.paypal_plan_id === planId
  );
  return entrada ? entrada[0] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const evento = req.body;
  // PENDIENTE SANDBOX: PayPal verifica la firma contra los BYTES crudos del
  // cuerpo. Aquí se pasa el objeto ya parseado (req.body), que al re-serializar
  // puede no coincidir y rechazar eventos legítimos. Antes de produccion: leer
  // el body crudo (raw) y verificar contra esa cadena. Validar en sandbox.
  const valido = await verificarWebhook(req.headers, evento);
  if (!valido) return res.status(400).json({ error: 'firma inválida' });

  const tipo = evento.event_type;
  const recurso = evento.resource || {};

  // ACTIVACIÓN: primer pago aprobado. custom_id trae el uid.
  if (tipo === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const uid = recurso.custom_id;
    const plan = planDesdePayPal(recurso.plan_id);
    if (uid && plan) {
      const accesoMs = calcularAccesoHasta(plan, Date.now(), CONFIG);
      await db.collection('users').doc(uid).set({
        status: 'active',
        plan,
        paypal_sub_id: recurso.id,
        acceso_hasta: new Date(accesoMs).toISOString(),
        actualizado: new Date().toISOString(),
      }, { merge: true });
      // Mapeo inverso para resolver renovaciones posteriores.
      await db.collection('paypal_subs').doc(recurso.id).set({ uid, plan });
    }
    return res.status(200).json({ ok: true });
  }

  // RENOVACIÓN: cada cobro de ciclo. Se ubica al usuario por billing_agreement_id.
  if (tipo === 'PAYMENT.SALE.COMPLETED') {
    const subId = recurso.billing_agreement_id;
    if (subId) {
      const map = await db.collection('paypal_subs').doc(subId).get();
      if (map.exists) {
        const { uid, plan } = map.data();
        // Si el plan ya no existe en CONFIG, ignorar (200) en vez de reintentar para siempre.
        if (!CONFIG.PLANES[plan]) return res.status(200).json({ ok: true, ignorado: 'plan-desconocido' });
        // PENDIENTE SANDBOX: la renovacion calcula desde Date.now(). Idealmente
        // extender desde max(acceso_hasta, fecha del evento) con deduplicacion por
        // id de evento para no perder dias pagados ni apilar duplicados. Ajustar
        // tras observar el timing real de PayPal en sandbox.
        const accesoMs = calcularAccesoHasta(plan, Date.now(), CONFIG);
        await db.collection('users').doc(uid).set({
          status: 'active',
          acceso_hasta: new Date(accesoMs).toISOString(),
          actualizado: new Date().toISOString(),
        }, { merge: true });
      }
    }
    return res.status(200).json({ ok: true });
  }

  // CANCELACIÓN / VENCIMIENTO: se marca canceled (conserva acceso hasta vencer).
  if (tipo === 'BILLING.SUBSCRIPTION.CANCELLED' || tipo === 'BILLING.SUBSCRIPTION.EXPIRED') {
    const subId = recurso.id;
    const map = await db.collection('paypal_subs').doc(subId).get();
    if (map.exists) {
      const { uid } = map.data();
      await db.collection('users').doc(uid).set({
        status: 'canceled',
        actualizado: new Date().toISOString(),
      }, { merge: true });
    }
    return res.status(200).json({ ok: true });
  }

  // Otros eventos: se aceptan sin actuar (PayPal espera 200).
  return res.status(200).json({ ok: true, ignorado: tipo });
}

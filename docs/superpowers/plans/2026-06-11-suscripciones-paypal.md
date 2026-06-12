# Suscripciones con PayPal — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la PWA de "código = dispositivo, para siempre" en una app de suscripción con cuenta de usuario, prueba gratis de 7 días y cobro recurrente por PayPal.

**Architecture:** Login por link mágico (Firebase Auth). El acceso se decide leyendo `users/{uid}` en Firestore (fuente de verdad). Funciones serverless en Vercel reciben los eventos de PayPal (webhook) y escriben el estado; el navegador solo lee. La lógica pura de fechas/acceso vive en un módulo compartido y probado (`logica-acceso.js`).

**Tech Stack:** JavaScript ESM, Node.js 22 (funciones Vercel), Firebase (Auth + Firestore + Admin SDK), PayPal REST Subscriptions API, Vitest para pruebas.

**Spec de referencia:** `docs/superpowers/specs/2026-06-11-suscripciones-paypal-design.md`

---

## Mapa de archivos

**Núcleo lógico (probado con Vitest):**
- `logica-acceso.js` — funciones puras: `tieneAcceso`, `calcularAccesoHasta`, `nuevoTrial`, `dentroDeGracia`. Sin DOM, sin red, sin Firebase.

**Configuración:**
- `config.js` — perillas no-secretas (días de trial, gracia, planes). Importado por navegador y backend.

**Backend (funciones Vercel, carpeta `/api`):**
- `api/_lib/firebase-admin.js` — inicializa Firebase Admin SDK desde variables de entorno.
- `api/_lib/paypal.js` — token OAuth de PayPal y verificación de firma de webhook.
- `api/perfil.js` — verifica el token del usuario, crea el trial si es nuevo, devuelve su estado.
- `api/crear-suscripcion.js` — crea la suscripción en PayPal y devuelve la URL de aprobación.
- `api/paypal-webhook.js` — recibe eventos de PayPal y actualiza Firestore (corazón).
- `api/portal.js` — devuelve la URL de PayPal para gestionar/cancelar.

**Frontend:**
- `auth.js` — login con link mágico (reemplaza `activacion.js`).
- `acceso.js` — orquesta: login / paywall / app + gracia offline. Usa `logica-acceso.js`.

**Infra / config:**
- `package.json`, `vitest.config.js`, `.gitignore` — setup de pruebas y dependencias.
- `vercel.json` — deploy.
- `.env.example` — nombres de variables de entorno (sin secretos).
- `firestore.rules` — reglas de seguridad.

**Modificados:** `index.html` (cambiar scripts), `sw.js` (excluir `/api/*`).
**Eliminados:** `activacion.js`.

---

## Task 1: Setup del proyecto y pruebas

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `.gitignore`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "medishort360-aspa",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Crear `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
  },
});
```

- [ ] **Step 3: Crear `.gitignore`**

```
node_modules/
.env
.env.local
.vercel
```

- [ ] **Step 4: Instalar dependencias**

Run: `npm install`
Expected: crea `node_modules/` y `package-lock.json` sin errores.

- [ ] **Step 5: Verificar que Vitest corre (sin tests aún)**

Run: `npm test`
Expected: "No test files found" (exit 0 o mensaje de sin archivos). Esto confirma que Vitest está instalado.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.js .gitignore package-lock.json
git commit -m "chore(setup): add vitest and node tooling for subscriptions"
```

---

## Task 2: Configuración (`config.js`)

**Files:**
- Create: `config.js`
- Test: `config.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
// config.test.js
import { describe, it, expect } from 'vitest';
import { CONFIG } from './config.js';

describe('CONFIG', () => {
  it('expone los días de trial y gracia como números positivos', () => {
    expect(CONFIG.TRIAL_DIAS).toBeGreaterThan(0);
    expect(CONFIG.GRACIA_OFFLINE_DIAS).toBeGreaterThan(0);
  });

  it('define los planes mensual y anual con plan_id de PayPal', () => {
    expect(CONFIG.PLANES.mensual.paypal_plan_id).toBeTruthy();
    expect(CONFIG.PLANES.anual.paypal_plan_id).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run config.test.js`
Expected: FAIL ("Cannot find module './config.js'").

- [ ] **Step 3: Crear `config.js`**

```js
// config.js — perillas ajustables (sin secretos)
// Cambiar un valor aquí lo actualiza en navegador y backend.
export const CONFIG = {
  TRIAL_DIAS: 7,              // duración de la prueba gratis
  GRACIA_OFFLINE_DIAS: 7,     // días de uso offline antes de exigir revalidación
  REVALIDAR_CADA_HORAS: 24,   // cada cuánto la app revalida online
  PLANES: {
    mensual: { label: 'Mensual', precio: '5.00',  meses: 1,  paypal_plan_id: 'P-REEMPLAZAR-MENSUAL' },
    anual:   { label: 'Anual',   precio: '40.00', meses: 12, paypal_plan_id: 'P-REEMPLAZAR-ANUAL' },
  },
};
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `npx vitest run config.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add config.js config.test.js
git commit -m "feat(config): add adjustable settings module"
```

---

## Task 3: Lógica de acceso pura (`logica-acceso.js`)

Este es el núcleo. Funciones puras (sin fecha implícita: el "ahora" se pasa
como parámetro en milisegundos para que las pruebas sean deterministas).

**Files:**
- Create: `logica-acceso.js`
- Test: `logica-acceso.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

```js
// logica-acceso.test.js
import { describe, it, expect } from 'vitest';
import {
  tieneAcceso, calcularAccesoHasta, nuevoTrial, dentroDeGracia,
} from './logica-acceso.js';

const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.parse('2026-06-11T12:00:00Z');

describe('tieneAcceso', () => {
  it('da acceso a trial vigente', () => {
    const perfil = { status: 'trial', acceso_hasta: new Date(AHORA + DIA).toISOString() };
    expect(tieneAcceso(perfil, AHORA)).toBe(true);
  });

  it('da acceso a suscripción activa vigente', () => {
    const perfil = { status: 'active', acceso_hasta: new Date(AHORA + DIA).toISOString() };
    expect(tieneAcceso(perfil, AHORA)).toBe(true);
  });

  it('niega acceso si acceso_hasta ya venció', () => {
    const perfil = { status: 'active', acceso_hasta: new Date(AHORA - DIA).toISOString() };
    expect(tieneAcceso(perfil, AHORA)).toBe(false);
  });

  it('niega acceso a status canceled aunque la fecha no haya vencido es decisión de la fecha', () => {
    // canceled sigue dando acceso hasta que acceso_hasta venza
    const vigente = { status: 'canceled', acceso_hasta: new Date(AHORA + DIA).toISOString() };
    const vencido = { status: 'canceled', acceso_hasta: new Date(AHORA - DIA).toISOString() };
    expect(tieneAcceso(vigente, AHORA)).toBe(true);
    expect(tieneAcceso(vencido, AHORA)).toBe(false);
  });

  it('niega acceso si el perfil es nulo o sin fecha', () => {
    expect(tieneAcceso(null, AHORA)).toBe(false);
    expect(tieneAcceso({ status: 'trial' }, AHORA)).toBe(false);
  });
});

describe('calcularAccesoHasta', () => {
  const config = { PLANES: { mensual: { meses: 1 }, anual: { meses: 12 } } };

  it('extiende un mes para el plan mensual', () => {
    const r = calcularAccesoHasta('mensual', AHORA, config);
    expect(r).toBe(new Date('2026-07-11T12:00:00Z').getTime());
  });

  it('extiende doce meses para el plan anual', () => {
    const r = calcularAccesoHasta('anual', AHORA, config);
    expect(r).toBe(new Date('2027-06-11T12:00:00Z').getTime());
  });

  it('lanza error si el plan no existe', () => {
    expect(() => calcularAccesoHasta('semanal', AHORA, config)).toThrow();
  });
});

describe('nuevoTrial', () => {
  it('crea un perfil trial con acceso_hasta a TRIAL_DIAS de hoy', () => {
    const config = { TRIAL_DIAS: 7 };
    const perfil = nuevoTrial(config, AHORA);
    expect(perfil.status).toBe('trial');
    expect(perfil.plan).toBe(null);
    expect(Date.parse(perfil.acceso_hasta)).toBe(AHORA + 7 * DIA);
  });
});

describe('dentroDeGracia', () => {
  const config = { GRACIA_OFFLINE_DIAS: 7 };

  it('permite uso offline si acceso_hasta venció hace menos que la gracia', () => {
    const perfil = { acceso_hasta: new Date(AHORA - 3 * DIA).toISOString() };
    expect(dentroDeGracia(perfil, AHORA, config)).toBe(true);
  });

  it('bloquea si acceso_hasta venció hace más que la gracia', () => {
    const perfil = { acceso_hasta: new Date(AHORA - 10 * DIA).toISOString() };
    expect(dentroDeGracia(perfil, AHORA, config)).toBe(false);
  });

  it('bloquea si no hay perfil cacheado', () => {
    expect(dentroDeGracia(null, AHORA, config)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests para verlos fallar**

Run: `npx vitest run logica-acceso.test.js`
Expected: FAIL ("Cannot find module './logica-acceso.js'").

- [ ] **Step 3: Implementar `logica-acceso.js`**

```js
// logica-acceso.js — lógica pura de acceso (sin DOM, red ni Firebase)
// "ahoraMs" se recibe siempre como parámetro para pruebas deterministas.

const DIA_MS = 24 * 60 * 60 * 1000;

// Acceso vigente: trial o activo (o cancelado aún no vencido) y fecha no expirada.
export function tieneAcceso(perfil, ahoraMs) {
  if (!perfil || !perfil.acceso_hasta) return false;
  const estadosConAcceso = ['trial', 'active', 'canceled'];
  if (!estadosConAcceso.includes(perfil.status)) return false;
  return ahoraMs < Date.parse(perfil.acceso_hasta);
}

// Nueva fecha de acceso al pagar/renovar un plan, contada desde "desdeMs".
export function calcularAccesoHasta(plan, desdeMs, config) {
  const def = config.PLANES[plan];
  if (!def) throw new Error(`Plan desconocido: ${plan}`);
  const d = new Date(desdeMs);
  d.setMonth(d.getMonth() + def.meses);
  return d.getTime();
}

// Perfil inicial de prueba gratis.
export function nuevoTrial(config, ahoraMs) {
  return {
    status: 'trial',
    plan: null,
    acceso_hasta: new Date(ahoraMs + config.TRIAL_DIAS * DIA_MS).toISOString(),
  };
}

// ¿El perfil cacheado offline aún está dentro del margen de gracia?
export function dentroDeGracia(perfilCacheado, ahoraMs, config) {
  if (!perfilCacheado || !perfilCacheado.acceso_hasta) return false;
  const limite = Date.parse(perfilCacheado.acceso_hasta) + config.GRACIA_OFFLINE_DIAS * DIA_MS;
  return ahoraMs < limite;
}
```

- [ ] **Step 4: Correr los tests para verlos pasar**

Run: `npx vitest run logica-acceso.test.js`
Expected: PASS (todos los tests).

- [ ] **Step 5: Commit**

```bash
git add logica-acceso.js logica-acceso.test.js
git commit -m "feat(acceso): add pure access-control logic with tests"
```

---

## Task 4: Firebase Admin (`api/_lib/firebase-admin.js`)

**Files:**
- Create: `api/_lib/firebase-admin.js`

- [ ] **Step 1: Crear el módulo**

```js
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
```

- [ ] **Step 2: Verificar que el archivo parsea**

Run: `node --check api/_lib/firebase-admin.js`
Expected: sin salida (exit 0) = sintaxis válida.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/firebase-admin.js
git commit -m "feat(api): add firebase admin initialization"
```

---

## Task 5: Helpers de PayPal (`api/_lib/paypal.js`)

**Files:**
- Create: `api/_lib/paypal.js`

- [ ] **Step 1: Crear el módulo**

```js
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
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check api/_lib/paypal.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add api/_lib/paypal.js
git commit -m "feat(api): add paypal rest helpers and webhook verification"
```

---

## Task 6: Perfil y creación de trial (`api/perfil.js`)

El navegador, tras iniciar sesión, llama a esta función con su token de
Firebase. El backend lo verifica, crea el trial si es usuario nuevo, y
devuelve el estado. Así la duración del trial se aplica en el servidor.

**Files:**
- Create: `api/perfil.js`

- [ ] **Step 1: Crear la función**

```js
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
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check api/perfil.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add api/perfil.js
git commit -m "feat(api): add profile endpoint with server-side trial creation"
```

---

## Task 7: Crear suscripción (`api/crear-suscripcion.js`)

**Files:**
- Create: `api/crear-suscripcion.js`

- [ ] **Step 1: Crear la función**

```js
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
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check api/crear-suscripcion.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add api/crear-suscripcion.js
git commit -m "feat(api): add paypal subscription creation endpoint"
```

---

## Task 8: Webhook de PayPal (`api/paypal-webhook.js`)

Corazón del sistema. Mapea cada evento al usuario y actualiza su acceso.
La lógica de fechas reusa `calcularAccesoHasta` (ya probada en Task 3).

**Files:**
- Create: `api/paypal-webhook.js`

- [ ] **Step 1: Crear la función**

```js
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
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check api/paypal-webhook.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add api/paypal-webhook.js
git commit -m "feat(api): add paypal webhook handler for subscription lifecycle"
```

---

## Task 9: Portal de gestión (`api/portal.js`)

PayPal no tiene un "customer portal" embebible como Stripe; el usuario
gestiona/cancela su suscripción desde su propia cuenta PayPal. Esta función
devuelve el enlace correcto.

**Files:**
- Create: `api/portal.js`

- [ ] **Step 1: Crear la función**

```js
// api/portal.js — devuelve el link donde el usuario gestiona su suscripción
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });

  // PayPal gestiona suscripciones desde la cuenta del usuario.
  const url = process.env.PAYPAL_ENV === 'live'
    ? 'https://www.paypal.com/myaccount/autopay/'
    : 'https://www.sandbox.paypal.com/myaccount/autopay/';

  return res.status(200).json({ url });
}
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check api/portal.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add api/portal.js
git commit -m "feat(api): add subscription management link endpoint"
```

---

## Task 10: Login con link mágico (`auth.js`)

**Files:**
- Create: `auth.js`

- [ ] **Step 1: Crear el módulo**

```js
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
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check auth.js`
Expected: sin salida (exit 0). (Los imports remotos no se resuelven en `--check`, pero la sintaxis sí se valida.)

- [ ] **Step 3: Commit**

```bash
git add auth.js
git commit -m "feat(auth): add magic-link email login"
```

---

## Task 11: Orquestador de acceso y paywall (`acceso.js`)

Decide qué pantalla mostrar: login, paywall o la app. Cachea el perfil para
la gracia offline. Usa `logica-acceso.js` (probado) y `auth.js`.

**Files:**
- Create: `acceso.js`

- [ ] **Step 1: Crear el módulo**

```js
// acceso.js — orquesta login / paywall / app, con gracia offline
import { authFb, enviarLink, completarLinkSiAplica } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { CONFIG } from './config.js';
import { tieneAcceso, dentroDeGracia } from './logica-acceso.js';

const LS_PERFIL = 'ms360_perfil_cache';

// Guarda/lee el perfil cacheado para uso offline.
function cachearPerfil(p) { localStorage.setItem(LS_PERFIL, JSON.stringify(p)); }
function leerPerfilCacheado() {
  try { return JSON.parse(localStorage.getItem(LS_PERFIL) || 'null'); } catch { return null; }
}

// Pide el perfil al backend usando el token de Firebase.
async function obtenerPerfil(user) {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/perfil', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error('perfil');
  return res.json();
}

// Inicia el flujo de suscripción para un plan.
async function suscribir(user, plan) {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/crear-suscripcion', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

// --- Vistas (reutilizan el contenedor #aspa-gate del HTML) ---

function mostrarApp() {
  const gate = document.getElementById('aspa-gate');
  if (gate) { gate.style.opacity = '0'; setTimeout(() => gate.remove(), 400); }
  window.dispatchEvent(new Event('ms360-acceso-ok'));
}

function vistaLogin() {
  const card = document.querySelector('.aspa-gate-card');
  card.innerHTML = `
    <img src="./icono-192.png" class="aspa-logo" alt="MEDISHORT360"/>
    <div class="aspa-gate-brand">MEDISHORT360 · ASPA</div>
    <div class="aspa-gate-title">Ingresa</div>
    <div class="aspa-gate-sub">Te enviaremos un enlace de acceso a tu correo.</div>
    <div class="aspa-input-row"><input id="aspa-email" type="email" placeholder="TU EMAIL" autocomplete="email"/></div>
    <button id="aspa-enviar" class="aspa-btn">Enviar enlace</button>
    <div id="aspa-msg" class="aspa-msg"></div>`;
  document.getElementById('aspa-enviar').onclick = async () => {
    const email = document.getElementById('aspa-email').value.trim();
    const msg = document.getElementById('aspa-msg');
    if (!email) { msg.textContent = 'Escribe tu email.'; msg.className = 'aspa-msg error'; return; }
    try {
      await enviarLink(email);
      msg.textContent = 'Revisa tu correo y abre el enlace.';
      msg.className = 'aspa-msg ok';
    } catch {
      msg.textContent = 'No se pudo enviar. Revisa tu conexión.';
      msg.className = 'aspa-msg error';
    }
  };
}

function vistaPaywall(user) {
  const card = document.querySelector('.aspa-gate-card');
  const p = CONFIG.PLANES;
  card.innerHTML = `
    <img src="./icono-192.png" class="aspa-logo" alt="MEDISHORT360"/>
    <div class="aspa-gate-brand">MEDISHORT360 · ASPA</div>
    <div class="aspa-gate-title">Suscríbete</div>
    <div class="aspa-gate-sub">Tu prueba terminó. Elige un plan para continuar.</div>
    <button id="plan-anual" class="aspa-btn">${p.anual.label} — $${p.anual.precio}/año</button>
    <button id="plan-mensual" class="aspa-btn" style="background:transparent;border:1.5px solid #c8a614;color:#c8a614;margin-top:10px">
      ${p.mensual.label} — $${p.mensual.precio}/mes</button>
    <div id="aspa-msg" class="aspa-msg"></div>`;
  document.getElementById('plan-anual').onclick = () => suscribir(user, 'anual');
  document.getElementById('plan-mensual').onclick = () => suscribir(user, 'mensual');
}

// --- Flujo principal ---

export async function iniciarAcceso() {
  // 1. Si venimos de un link mágico, completar el login.
  try { await completarLinkSiAplica(); } catch { /* email mal confirmado: seguirá a login */ }

  // 2. Reaccionar al estado de sesión.
  onAuthStateChanged(authFb, async (user) => {
    if (!user) {
      // Sin sesión: intentar gracia offline antes de pedir login.
      const cache = leerPerfilCacheado();
      if (!navigator.onLine && dentroDeGracia(cache, Date.now(), CONFIG)) { mostrarApp(); return; }
      vistaLogin();
      return;
    }

    // 3. Con sesión: obtener perfil (o caer a cache si no hay red).
    let perfil;
    try {
      perfil = await obtenerPerfil(user);
      cachearPerfil(perfil);
    } catch {
      perfil = leerPerfilCacheado();
      if (dentroDeGracia(perfil, Date.now(), CONFIG)) { mostrarApp(); return; }
    }

    // 4. Decidir acceso.
    if (perfil && tieneAcceso(perfil, Date.now())) mostrarApp();
    else vistaPaywall(user);
  });
}
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check acceso.js`
Expected: sin salida (exit 0).

- [ ] **Step 3: Commit**

```bash
git add acceso.js
git commit -m "feat(acceso): add login/paywall/app orchestration with offline grace"
```

---

## Task 12: Conectar en `index.html`, ajustar `sw.js`, quitar `activacion.js`

**Files:**
- Modify: `index.html:150-152`
- Modify: `sw.js:40-47`
- Modify: `app.js:329` (arrancar tras acceso OK)
- Delete: `activacion.js`

- [ ] **Step 1: Cambiar los scripts en `index.html`**

Reemplazar estas líneas (actualmente al final del body):

```html
    <script src="./app.js"></script>
    <!-- Lógica de activación con Firebase (módulo, no toca app.js) -->
    <script type="module" src="./activacion.js"></script>
```

por:

```html
    <script src="./app.js"></script>
    <!-- Acceso: login + suscripción (módulos, no tocan app.js) -->
    <script type="module">
      import { iniciarAcceso } from './acceso.js';
      iniciarAcceso();
    </script>
```

- [ ] **Step 2: Excluir `/api/*` del cache en `sw.js`**

En el handler `fetch` de `sw.js`, junto a la exclusión de Firebase/Google,
añadir la exclusión de la API propia. Reemplazar:

```js
    if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic')) {
        return; // deja que el navegador lo maneje normalmente
    }
```

por:

```js
    if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic')
        || url.includes('/api/') || url.includes('paypal')) {
        return; // deja que el navegador lo maneje normalmente
    }
```

- [ ] **Step 3: Subir versión de cache en `sw.js`**

En `sw.js:2`, cambiar `medishort360-aspa-v3` por `medishort360-aspa-v4` para
forzar limpieza del cache viejo. En la lista `urlsParaCache`, quitar
`'./activacion.js'` y añadir `'./acceso.js'`, `'./auth.js'`, `'./config.js'`,
`'./logica-acceso.js'`.

- [ ] **Step 4: Arrancar la app solo tras acceso OK**

En `app.js`, el bloque `DOMContentLoaded` (línea ~329) renderiza el header,
form y resultado de inmediato. Para no renderizar la calculadora detrás del
gate, envolver el render en el evento `ms360-acceso-ok`. Reemplazar:

```js
document.addEventListener("DOMContentLoaded",()=>{
  makeParticles();
```

por:

```js
function arrancarApp(){
  makeParticles();
```

y al final de ese mismo bloque (después de `renderResult();` que cierra el
listener), reemplazar el cierre `});` por `}` y añadir debajo:

```js
window.addEventListener('ms360-acceso-ok', arrancarApp);
```

- [ ] **Step 5: Eliminar `activacion.js`**

Run: `git rm activacion.js`
Expected: marca el archivo para borrado.

- [ ] **Step 6: Verificar sintaxis de los archivos tocados**

Run: `node --check sw.js && node --check app.js`
Expected: sin salida (exit 0) en ambos.

- [ ] **Step 7: Commit**

```bash
git add index.html sw.js app.js
git commit -m "feat(app): wire access gate, drop device-code activation"
```

---

## Task 13: Reglas de seguridad de Firestore

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Crear `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuario solo puede LEER su propio documento.
    // Nadie escribe desde el navegador: solo el backend (Admin SDK) escribe.
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
    // Mapeo de suscripciones: solo backend. Cerrado al cliente.
    match /paypal_subs/{subId} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Documentar el despliegue de las reglas**

Las reglas se publican desde la consola de Firebase (Firestore Database →
Rules → pegar → Publish). El Admin SDK del backend ignora estas reglas, por
eso puede escribir.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(security): add firestore rules locking writes to backend"
```

---

## Task 14: Configuración de despliegue y variables de entorno

**Files:**
- Create: `vercel.json`
- Create: `.env.example`

- [ ] **Step 1: Crear `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/*.js": { "runtime": "nodejs22.x" }
  }
}
```

- [ ] **Step 2: Crear `.env.example`**

```
# Firebase Admin (Service Account → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=medishort360-f6f20
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# PayPal (Developer Dashboard → Apps & Credentials)
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_WEBHOOK_ID=
```

- [ ] **Step 3: Verificar que `.env` está ignorado**

Run: `git check-ignore .env`
Expected: imprime `.env` (confirma que está ignorado por `.gitignore`).

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example
git commit -m "chore(deploy): add vercel config and env template"
```

---

## Verificación final (manual / sandbox)

Estos pasos no son automatizables; se hacen una vez antes de producción.

- [ ] Correr toda la suite: `npm test` → todos los tests en verde.
- [ ] Crear los dos planes en PayPal (sandbox) y poner sus `plan_id` en `config.js`.
- [ ] Configurar variables de entorno en Vercel y desplegar.
- [ ] Registrar la URL del webhook en PayPal Developer y copiar `PAYPAL_WEBHOOK_ID`.
- [ ] Publicar `firestore.rules` en la consola de Firebase.
- [ ] Habilitar "Email link (passwordless)" en Firebase Auth y añadir el dominio de Vercel a los dominios autorizados.
- [ ] Probar flujo completo en sandbox: registro → trial → fin de trial → pago → acceso → cancelar → vencimiento.
- [ ] Probar offline: con acceso vigente, cortar red, recargar → la app abre (gracia).
- [ ] Cambiar `PAYPAL_ENV=live` y credenciales live para producción.

---

## Notas para quien implementa

- **TDD aplica al núcleo lógico** (`config.js`, `logica-acceso.js`): test primero, luego código.
- **Las funciones de `/api` y los módulos de navegador** se validan con `node --check` (sintaxis) y se prueban de verdad en el sandbox de PayPal, porque dependen de red/credenciales externas.
- **DRY:** la lógica de fechas vive solo en `logica-acceso.js` y la usan tanto el webhook como el navegador.
- **Secretos:** nunca en el repo. Solo en variables de entorno de Vercel.
- **`app.js` (la calculadora) casi no se toca:** solo se cambia para arrancar tras el evento `ms360-acceso-ok`.
- **innerHTML / XSS:** las vistas de `acceso.js` usan `innerHTML` solo con valores controlados de `CONFIG` (precios, etiquetas). El email que escribe el usuario nunca se interpola como HTML (se lee con `.value` y se muestra con `textContent`). Es el mismo patrón que ya usa `app.js`. Si en el futuro se inyecta texto del usuario dentro de `innerHTML`, usar `textContent` o sanitizar con DOMPurify.

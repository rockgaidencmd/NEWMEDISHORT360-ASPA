# Diseño: Migración a suscripciones con PayPal

Fecha: 2026-06-11
Rama: `feature/suscripciones-paypal`
Estado: Aprobado para implementación

## Objetivo

Convertir MEDISHORT360-ASPA (hoy una PWA estática con activación por
"código = dispositivo, para siempre") en una app de **suscripción** vendible
a nivel global, cobrando con **PayPal** desde Ecuador.

El acceso pasa a estar atado a una **cuenta de usuario** (no a un dispositivo)
y debe poder **vencer y revocarse** cuando la suscripción termina.

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| Planes | Mensual + Anual (se empuja el anual por la comisión fija de PayPal) |
| Prueba gratis | 7 días, sin tarjeta, controlada por nosotros en Firestore |
| Login | Link mágico por email (Firebase Auth, sin contraseñas) |
| Acceso offline | 7 días de gracia; luego exige revalidación online |
| Validación de licencia | Enfoque A: documento de usuario en Firestore como fuente de verdad |
| Hosting + backend | Todo en Vercel (estático + funciones serverless) |
| Cobro | PayPal Subscriptions API; arquitectura preparada para añadir un Merchant of Record (Lemon Squeezy/Paddle) después |

### Por qué PayPal y no Stripe

Stripe no está disponible para abrir cuenta desde Ecuador. PayPal sí permite,
desde 2024, asociar una cuenta bancaria ecuatoriana y retirar fondos
(~7 días hábiles, comisión mínima ~$10 por retiro → conviene acumular y
retirar mensualmente). PayPal ofrece Subscriptions API + webhooks, que es
lo que la arquitectura necesita.

## Arquitectura

```
NAVEGADOR (PWA actual + login)
  index.html -> login (link mágico)
     -> lee users/{uid} en Firestore: ¿tiene acceso?
        SÍ -> calculadora (app.js, intacto)
        NO -> pantalla "Suscríbete" -> PayPal Checkout
            |                          |
         Firebase Auth            PayPal (Subscriptions + webhooks)
            |                          | avisa pagó/canceló/venció
            v                          v
        FIRESTORE: users/{uid} { email, status, plan, acceso_hasta, paypal_sub_id }
            ^                          ^
            | escribe trial al        | escribe estado de pago
            | crear cuenta            |
        FUNCIONES EN VERCEL
          /api/crear-suscripcion  -> inicia la suscripción en PayPal
          /api/paypal-webhook     -> recibe avisos de PayPal (corazón del sistema)
          /api/portal             -> link para gestionar/cancelar
```

Principio clave: la calculadora (`app.js`) **no se modifica**. Toda la lógica
nueva vive en archivos separados, igual que hoy `activacion.js` está aislado.

## Flujos

### A. Registro y prueba (sin tocar PayPal)
```
Abre la app -> ingresa email -> recibe link mágico -> entra
-> se crea users/{uid}: { status:"trial", acceso_hasta: hoy+7días }
-> usa la app completa por 7 días
```

### B. Suscripción (al acabar la prueba o antes)
```
La app detecta acceso_hasta vencido -> muestra "Suscríbete" (Mensual/Anual)
-> elige plan -> /api/crear-suscripcion arma la suscripción en PayPal
-> paga en PayPal -> PayPal avisa a /api/paypal-webhook
-> la función pone { status:"active", acceso_hasta: +1 mes o +1 año }
-> app desbloqueada
```

### C. Renovación / cancelación (automático)
```
Cada ciclo PayPal cobra solo -> webhook extiende acceso_hasta
Si cancela o falla el pago -> webhook pone status:"canceled"
-> al vencer acceso_hasta, la app se bloquea sola
```

### D. Offline
```
La app guarda acceso_hasta en el dispositivo (localStorage)
Sin internet: funciona si hoy < acceso_hasta (margen de 7 días)
Al reconectar: revalida contra Firestore
```

## Archivos

### Nuevos
```
/api/
  crear-suscripcion.js     Arma la suscripción en PayPal para el plan elegido
  paypal-webhook.js        Recibe eventos de PayPal y actualiza Firestore (corazón)
  portal.js                Devuelve link para gestionar/cancelar la suscripción
  _lib/
    firebase-admin.js      Inicializa Firebase Admin SDK (credenciales de servidor)
    paypal.js              Helpers: obtener access token, verificar firma del webhook
auth.js                    Login con link mágico (reemplaza a activacion.js)
acceso.js                  Decide: mostrar app / paywall / login + gracia offline
vercel.json                Configuración de deploy de Vercel
.env.example               Plantilla de variables de entorno (sin secretos reales)
```

La pantalla "Suscríbete" (paywall) se inyecta en el DOM reutilizando los
estilos del gate actual, no necesita archivo HTML separado.

### Modificados
- `index.html`: reemplazar `<script src="activacion.js">` por los nuevos
  scripts; el contenedor visual del gate se reutiliza.
- `sw.js`: excluir `/api/*` del cache (siempre a la red, igual que ya excluye
  Firebase/Google).
- `app.js`: sin cambios en la lógica; solo se arranca después de que
  `acceso.js` dé luz verde.

### Eliminados
- `activacion.js` y toda la lógica de "código por dispositivo".

## Modelo de datos

`users/{uid}` en Firestore:

```js
{
  email:         "enfermero@mail.com",
  status:        "trial" | "active" | "canceled" | "expired",
  plan:          "mensual" | "anual" | null,
  acceso_hasta:  "2026-06-18T00:00:00Z",   // fuente de verdad del acceso
  paypal_sub_id: "I-XXXX",                  // id de suscripción en PayPal
  creado:        "2026-06-11T00:00:00Z",
  actualizado:   "2026-06-11T00:00:00Z"     // lo toca el webhook
}
```

Regla de acceso (lógica central):
```
tiene_acceso = (status == "trial" || status == "active") && hoy < acceso_hasta
```

## Seguridad

- **Reglas de Firestore**: cada usuario solo puede LEER su propio documento;
  ningún cliente puede ESCRIBIRLO. Solo el webhook (backend con Admin SDK)
  escribe. Esto cierra el agujero actual de "desbloquear gratis" desde el
  navegador.
- **Verificación del webhook**: validar la firma de cada evento de PayPal
  antes de confiar en él (evita que alguien falsifique un "pagó").
- **Secretos**: claves de PayPal y credenciales de Firebase Admin viven solo
  en variables de entorno de Vercel, nunca en el repo. `.env.example` solo
  documenta los nombres.

## Manejo de errores y casos borde

- **Webhook duplicado o fuera de orden**: las escrituras son idempotentes;
  se calcula `acceso_hasta` desde los datos del evento, no se incrementa a
  ciegas.
- **Pago fallido / reintento**: `status:"canceled"` no borra el acceso de
  inmediato; el usuario conserva acceso hasta `acceso_hasta`.
- **Reloj del dispositivo manipulado (offline)**: la gracia offline es de
  solo 7 días; al reconectar, Firestore manda. El riesgo de abuso es acotado.
- **Usuario sin internet en el primer arranque**: si nunca validó, no hay
  `acceso_hasta` cacheado -> se exige conexión para la activación inicial.
- **Email mal escrito en login**: el link mágico simplemente no llega; no se
  crea sesión. Se permite reintentar.

## Estrategia de pruebas

- **Lógica de acceso (`acceso.js`)**: pruebas unitarias de `tiene_acceso` con
  fechas límite (vencido hoy, vence mañana, gracia offline agotada).
- **Cálculo de `acceso_hasta`** en el webhook: pruebas para mensual/anual,
  renovación, cancelación.
- **Webhook**: probar con eventos de ejemplo de PayPal (sandbox) y firma
  inválida (debe rechazar).
- **Calculadora (`app.js`)**: sin cambios, pero se verifica que sigue
  funcionando tras el gate.
- **Manual / sandbox**: flujo completo en el entorno sandbox de PayPal antes
  de pasar a producción.

## Fuera de alcance (YAGNI por ahora)

- Merchant of Record (Lemon Squeezy/Paddle): se deja la arquitectura lista
  pero no se implementa en esta primera versión.
- Manejo automático de impuestos globales.
- Panel de administración propio (se usa el dashboard de PayPal).
- Pasarelas locales (PayPhone, Datafast).
- Multi-idioma.
```

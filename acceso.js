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

// Inicia el flujo de suscripción para un plan. Lanza si no hay URL de pago.
async function suscribir(user, plan) {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/crear-suscripcion', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.url) throw new Error('sin_url');
  window.location.href = data.url;
}

// Calcula el ahorro del plan anual frente al mensual anualizado.
function metricasPlanes(p) {
  const mes = parseFloat(p.mensual.precio);
  const anio = parseFloat(p.anual.precio);
  const anualizado = mes * 12;
  const pct = anualizado > 0 ? Math.round((1 - anio / anualizado) * 100) : 0;
  const equivMes = Number.isFinite(anio) ? (anio / 12).toFixed(2) : null;
  return { pct, equivMes };
}

// --- Iconos SVG inline (sin dependencias) ---
const iconoMail = `<svg class="gate-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
const iconoCandado = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`;
const iconoWifiOff = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l20 20"/><path d="M5 12.6a10 10 0 0 1 4-2.5"/><path d="M10.7 5.1A15 15 0 0 1 22.6 9"/><path d="M1.4 8.9A15 15 0 0 1 6 6"/><path d="M8.5 16a6 6 0 0 1 7-1"/><path d="M12 20h.01"/></svg>`;

// --- Vistas (reutilizan el contenedor #aspa-gate del HTML) ---

function card() { return document.querySelector('.aspa-gate-card'); }

// Cabecera común: logo con anillo dorado + marca.
function cabecera() {
  return `
    <div class="gate-logo-wrap">
      <span class="gate-logo-ring"></span>
      <img src="./icono-192.png" class="gate-logo" alt="MEDISHORT360"/>
    </div>
    <div class="gate-eyebrow">MEDISHORT360 · ASPA</div>`;
}

function mostrarApp() {
  const gate = document.getElementById('aspa-gate');
  // Primero arranca la app (detrás del gate), luego se desvanece el gate.
  window.dispatchEvent(new Event('ms360-acceso-ok'));
  if (gate) { gate.style.opacity = '0'; setTimeout(() => gate.remove(), 450); }
}

function vistaVerificando() {
  card().innerHTML = `
    ${cabecera()}
    <div class="gate-spinner" role="status" aria-label="Verificando"></div>
    <h1 class="gate-display" style="font-size:22px">Verificando tu acceso</h1>
    <p class="gate-sub2">Un momento…</p>`;
}

function vistaErrorConexion(onRetry) {
  card().innerHTML = `
    ${cabecera()}
    <div class="gate-state-icon">${iconoWifiOff}</div>
    <h1 class="gate-display" style="font-size:23px">Sin conexión</h1>
    <p class="gate-sub2">No pudimos verificar tu acceso. Revisa tu internet e inténtalo de nuevo.</p>
    <button id="gate-retry" class="gate-btn">Reintentar</button>`;
  document.getElementById('gate-retry').onclick = onRetry;
}

function vistaLogin() {
  card().innerHTML = `
    ${cabecera()}
    <h1 class="gate-display">Bienvenido</h1>
    <p class="gate-sub2">Ingresa tu correo y te enviaremos un enlace seguro para entrar. Sin contraseñas.</p>
    <label class="gate-field">
      ${iconoMail}
      <input id="aspa-email" type="email" placeholder="tucorreo@ejemplo.com"
             autocomplete="email" inputmode="email" spellcheck="false"/>
    </label>
    <button id="aspa-enviar" class="gate-btn">Enviar enlace de acceso</button>
    <div id="aspa-msg" class="gate-msg"></div>
    <div class="gate-trust">${iconoCandado} Acceso protegido · Solo personal de salud</div>`;

  const btn = document.getElementById('aspa-enviar');
  btn.onclick = async () => {
    const email = document.getElementById('aspa-email').value.trim();
    const msg = document.getElementById('aspa-msg');
    if (!email) { msg.textContent = 'Escribe tu email.'; msg.className = 'gate-msg error'; return; }
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      await enviarLink(email);
      msg.textContent = 'Listo. Revisa tu correo y abre el enlace.';
      msg.className = 'gate-msg ok';
      btn.textContent = 'Enlace enviado';
    } catch {
      msg.textContent = 'No se pudo enviar. Revisa tu conexión.';
      msg.className = 'gate-msg error';
      btn.disabled = false; btn.textContent = 'Enviar enlace de acceso';
    }
  };
}

function vistaPaywall(user) {
  const p = CONFIG.PLANES;
  const m = metricasPlanes(p);
  const badge = m.pct > 0 ? `<span class="plan-badge">Mejor valor · ahorra ${m.pct}%</span>` : '';
  const equiv = m.equivMes ? `Equivale a $${m.equivMes}/mes` : 'El plan más conveniente';

  card().innerHTML = `
    ${cabecera()}
    <h1 class="gate-display">Tu prueba terminó</h1>
    <p class="gate-sub2">Sigue calculando diluciones sin límites. Elige el plan que prefieras.</p>
    <div class="plan-grid">
      <button id="plan-anual" class="plan-card featured" type="button">
        ${badge}
        <span class="plan-name">${p.anual.label}</span>
        <span class="plan-price">$${p.anual.precio}<span class="plan-period">/año</span></span>
        <span class="plan-note">${equiv}</span>
      </button>
      <button id="plan-mensual" class="plan-card" type="button">
        <span class="plan-name">${p.mensual.label}</span>
        <span class="plan-price">$${p.mensual.precio}<span class="plan-period">/mes</span></span>
        <span class="plan-note">Flexible, cancela cuando quieras</span>
      </button>
    </div>
    <div id="aspa-msg" class="gate-msg"></div>
    <div class="gate-trust">${iconoCandado} Pago seguro con PayPal · Cancela cuando quieras</div>`;

  const ir = (plan, btn) => async () => {
    const msg = document.getElementById('aspa-msg');
    btn.classList.add('cargando');
    msg.textContent = 'Abriendo pago seguro…'; msg.className = 'gate-msg ok';
    try {
      await suscribir(user, plan);
    } catch {
      btn.classList.remove('cargando');
      msg.textContent = 'No se pudo iniciar el pago. Inténtalo de nuevo.';
      msg.className = 'gate-msg error';
    }
  };
  const anual = document.getElementById('plan-anual');
  const mensual = document.getElementById('plan-mensual');
  anual.onclick = ir('anual', anual);
  mensual.onclick = ir('mensual', mensual);
}

// --- Flujo principal ---

// Resuelve el acceso de un usuario con sesión: verifica, decide y muestra.
async function resolverAcceso(user) {
  vistaVerificando();
  let perfil;
  try {
    perfil = await obtenerPerfil(user);
    cachearPerfil(perfil);
  } catch {
    // Falla de red: si el cache aún está dentro de la gracia, dejar pasar.
    const cache = leerPerfilCacheado();
    if (dentroDeGracia(cache, Date.now(), CONFIG)) { mostrarApp(); return; }
    // No podemos verificar y no hay gracia: NO asumir que perdió el acceso;
    // ofrecer reintentar en vez de mandar al paywall a un suscriptor válido.
    vistaErrorConexion(() => resolverAcceso(user));
    return;
  }
  // Perfil confirmado por el servidor: decisión definitiva.
  if (tieneAcceso(perfil, Date.now())) mostrarApp();
  else vistaPaywall(user);
}

export async function iniciarAcceso() {
  // SOLO DESARROLLO: salta el gate y muestra la app directo. Ver config.js.
  if (CONFIG.DEV_BYPASS_ACCESO) { mostrarApp(); return; }

  // Estado inicial inmediato mientras se resuelve la sesión.
  vistaVerificando();

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
    await resolverAcceso(user);
  });
}

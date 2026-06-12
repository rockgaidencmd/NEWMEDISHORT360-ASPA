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

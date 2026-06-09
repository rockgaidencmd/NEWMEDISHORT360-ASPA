// ===== activacion.js · MEDISHORT360 ASPA · Un código = un dispositivo =====
// INSTRUCCIONES: Reemplaza firebaseConfig con los datos de tu proyecto Firebase

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc, updateDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ─────────────────────────────────────────────
//  🔧 REEMPLAZA CON TU CONFIGURACIÓN FIREBASE
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};
// ─────────────────────────────────────────────

const COLECCION   = 'medishort360';
const LS_KEY      = 'ms360aspa_activado';
const LS_CODE_KEY = 'ms360aspa_codigo';

// ——— Inicializar Firebase ———
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ——— Generar ID estable del dispositivo ———
// Basado en hardware del navegador — no cambia si reinstalan la app
function generarDispositivoId() {
  const datos = [
    navigator.language || '',
    navigator.platform || '',
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.hardwareConcurrency || '',
    navigator.deviceMemory || '',
  ].join('|');

  let hash = 0;
  for (let i = 0; i < datos.length; i++) {
    const char = datos.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'dev_' + Math.abs(hash).toString(36);
}

// ——— Verificar y activar código ———
async function verificarCodigo(codigo) {
  const codigoLimpio = codigo.trim().toUpperCase();
  const dispositivoId = generarDispositivoId();

  let docSnap;
  try {
    const docRef = doc(db, COLECCION, codigoLimpio);
    docSnap = await getDoc(docRef);
  } catch (e) {
    return { valido: false, razon: 'error_red' };
  }

  if (!docSnap.exists()) return { valido: false, razon: 'no_encontrado' };

  const data = docSnap.data();
  if (data.activo === false) return { valido: false, razon: 'inactivo' };

  const dispositivoGuardado = data.dispositivo_id || '';

  // Código sin usar → asignar este dispositivo
  if (dispositivoGuardado === '') {
    try {
      await updateDoc(doc(db, COLECCION, codigoLimpio), {
        dispositivo_id: dispositivoId
      });
      return { valido: true };
    } catch (e) {
      return { valido: false, razon: 'error_escritura' };
    }
  }

  // Mismo dispositivo → permitir (reinstalación)
  if (dispositivoGuardado === dispositivoId) return { valido: true };

  // Otro dispositivo → bloquear
  return { valido: false, razon: 'otro_dispositivo' };
}

// ——— Lógica del gate ———
function yaActivado() {
  return localStorage.getItem(LS_KEY) === '1';
}

function marcarActivado(codigo) {
  localStorage.setItem(LS_KEY, '1');
  localStorage.setItem(LS_CODE_KEY, codigo);
}

function ocultarGate() {
  const gate = document.getElementById('aspa-gate');
  if (gate) {
    gate.style.opacity = '0';
    gate.style.transition = 'opacity 0.5s ease';
    setTimeout(() => gate.remove(), 500);
  }
}

async function intentarActivar() {
  const input  = document.getElementById('aspa-code-input');
  const btn    = document.getElementById('aspa-activate-btn');
  const errMsg = document.getElementById('aspa-error');
  const codigo = input ? input.value.trim() : '';

  if (!codigo) { mostrarError('Ingresa un código de activación.'); return; }

  btn.disabled       = true;
  btn.textContent    = 'Verificando...';
  if (errMsg) { errMsg.textContent = ''; errMsg.style.opacity = '0'; }
  input.style.borderColor = '';

  try {
    const resultado = await verificarCodigo(codigo);

    if (resultado.valido) {
      marcarActivado(codigo.toUpperCase());
      btn.textContent = '✅ ¡Activado!';
      btn.style.background = '#c8a614';
      setTimeout(ocultarGate, 700);
    } else {
      const mensajes = {
        no_encontrado:    'Código inválido. Verifica e intenta de nuevo.',
        inactivo:         'Este código ha sido desactivado.',
        otro_dispositivo: 'Este código ya está en uso en otro dispositivo.',
        error_red:        'Error de conexión. Verifica tu internet.',
        error_escritura:  'Error al activar. Intenta de nuevo.',
      };
      mostrarError(mensajes[resultado.razon] || 'Código inválido.');
      btn.disabled    = false;
      btn.textContent = 'Activar';
    }
  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
    btn.disabled    = false;
    btn.textContent = 'Activar';
  }
}

function mostrarError(msg) {
  const errMsg = document.getElementById('aspa-error');
  const input  = document.getElementById('aspa-code-input');
  if (errMsg) {
    errMsg.textContent = msg;
    errMsg.style.opacity = '1';
  }
  if (input) {
    input.style.borderColor = '#ff4d6d';
    input.style.animation = 'none';
    void input.offsetWidth;
    input.style.animation = 'shake 0.4s ease';
  }
}

// ——— Inicializar al cargar ———
document.addEventListener('DOMContentLoaded', () => {
  if (yaActivado()) {
    const gate = document.getElementById('aspa-gate');
    if (gate) gate.remove();
    return;
  }

  const gate = document.getElementById('aspa-gate');
  if (gate) gate.style.display = 'flex';

  const btn   = document.getElementById('aspa-activate-btn');
  const input = document.getElementById('aspa-code-input');

  if (btn)   btn.addEventListener('click', intentarActivar);
  if (input) input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') intentarActivar();
  });
  if (input) input.addEventListener('input', (e) => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(pos, pos);
    e.target.style.borderColor = '';
  });
});

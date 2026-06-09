// ===== activacion.js · MEDISHORT360 · Un código = un dispositivo =====

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc, updateDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyApl919VrDKdV1AdHtZsrVYUC0zym-ZrZs",
  authDomain:        "medishort360-f6f20.firebaseapp.com",
  projectId:         "medishort360-f6f20",
  storageBucket:     "medishort360-f6f20.firebasestorage.app",
  messagingSenderId: "127659670697",
  appId:             "1:127659670697:web:b845e760917ba77e253db8"
};

const COLECCION   = 'codigos_aspa';
const LS_KEY      = 'ms360aspa_activado';
const LS_CODE_KEY = 'ms360aspa_codigo';

const app = initializeApp(firebaseConfig, 'ms360-' + COLECCION);
const db  = getFirestore(app);

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
  if (data.estado === 'DESACTIVADO' || data.activo === false) return { valido: false, razon: 'inactivo' };
  const dispositivoGuardado = data.dispositivo_id || '';
  if (data.estado === 'DISPONIBLE' && dispositivoGuardado === '') {
    try {
      await updateDoc(doc(db, COLECCION, codigoLimpio), {
        estado: 'USADO',
        dispositivo_id: dispositivoId,
        fecha_activacion: new Date().toISOString(),
      });
      return { valido: true };
    } catch (e) {
      return { valido: false, razon: 'error_escritura' };
    }
  }
  if (data.estado === 'USADO' && dispositivoGuardado === dispositivoId) return { valido: true };
  if (data.estado === 'USADO' && dispositivoGuardado !== dispositivoId) return { valido: false, razon: 'otro_dispositivo' };
  return { valido: false, razon: 'no_encontrado' };
}

function yaActivado() { return localStorage.getItem(LS_KEY) === '1'; }
function marcarActivado(codigo) {
  localStorage.setItem(LS_KEY, '1');
  localStorage.setItem(LS_CODE_KEY, codigo);
}

function ocultarGate() {
  const gate = document.getElementById('aspa-gate') || document.getElementById('activation-gate');
  if (gate) {
    gate.style.animation = 'gateFadeOut 0.5s ease forwards';
    setTimeout(() => gate.remove(), 500);
  }
}

async function intentarActivar() {
  const input  = document.getElementById('aspa-code-input') || document.getElementById('gate-input');
  const btn    = document.getElementById('aspa-activate-btn') || document.getElementById('gate-btn');
  const errMsg = document.getElementById('aspa-error') || document.getElementById('gate-error');
  const codigo = input ? input.value.trim() : '';
  if (!codigo) { mostrarError('Ingresa un código de activación.'); return; }
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  if (errMsg) { errMsg.textContent = ''; errMsg.classList && errMsg.classList.remove('visible'); }
  if (input)  input.classList && input.classList.remove('shake');
  try {
    const resultado = await verificarCodigo(codigo);
    if (resultado.valido) {
      marcarActivado(codigo.toUpperCase());
      btn.textContent = '✅ ¡Activado!';
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
      btn.disabled = false;
      btn.textContent = btn.id === 'aspa-activate-btn' ? 'Activar' : 'ACTIVAR';
    }
  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
    btn.disabled = false;
    btn.textContent = btn.id === 'aspa-activate-btn' ? 'Activar' : 'ACTIVAR';
  }
}

function mostrarError(msg) {
  const errMsg = document.getElementById('aspa-error') || document.getElementById('gate-error');
  const input  = document.getElementById('aspa-code-input') || document.getElementById('gate-input');
  if (errMsg) { errMsg.textContent = msg; errMsg.classList ? errMsg.classList.add('visible') : (errMsg.style.opacity = '1'); }
  if (input) { input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); }
}

document.addEventListener('DOMContentLoaded', () => {
  if (yaActivado()) {
    const gate = document.getElementById('aspa-gate') || document.getElementById('activation-gate');
    if (gate) gate.remove();
    return;
  }
  const gate = document.getElementById('aspa-gate') || document.getElementById('activation-gate');
  if (gate) gate.style.display = 'flex';
  const btn   = document.getElementById('aspa-activate-btn') || document.getElementById('gate-btn');
  const input = document.getElementById('aspa-code-input')   || document.getElementById('gate-input');
  if (btn)   btn.addEventListener('click', intentarActivar);
  if (input) {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarActivar(); });
    input.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(pos, pos);
    });
  }
});

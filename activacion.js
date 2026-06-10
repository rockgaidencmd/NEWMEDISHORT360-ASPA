// ===== activacion.js · MEDISHORT360 ASPA · Un código = un dispositivo =====
 
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
 
const app = initializeApp(firebaseConfig, 'ms360-aspa');
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
    docSnap = await getDoc(doc(db, COLECCION, codigoLimpio));
  } catch (e) {
    return { valido: false, razon: 'error_red' };
  }
  if (!docSnap.exists()) return { valido: false, razon: 'no_encontrado' };
  const data = docSnap.data();
  if (data.estado === 'DESACTIVADO' || data.activo === false)
    return { valido: false, razon: 'inactivo' };
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
  if (data.estado === 'USADO' && dispositivoGuardado === dispositivoId)
    return { valido: true };
  if (data.estado === 'USADO' && dispositivoGuardado !== dispositivoId)
    return { valido: false, razon: 'otro_dispositivo' };
  return { valido: false, razon: 'no_encontrado' };
}
 
function yaActivado() { return localStorage.getItem(LS_KEY) === '1'; }
 
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
 
function mostrarError(msg) {
  const msgEl = document.getElementById('aspa-msg');
  const input = document.getElementById('aspa-codigo');
  if (msgEl) { msgEl.textContent = msg; msgEl.className = 'aspa-msg error'; }
  if (input)  { input.style.borderColor = '#ff6b81'; }
}
 
async function intentarActivar() {
  const input = document.getElementById('aspa-codigo');
  const btn   = document.getElementById('aspa-activar');
  const msgEl = document.getElementById('aspa-msg');
  const codigo = input ? input.value.trim() : '';
 
  if (!codigo) { mostrarError('Ingresa un código de activación.'); return; }
 
  btn.disabled    = true;
  btn.textContent = 'Verificando...';
  if (msgEl) { msgEl.textContent = ''; msgEl.className = 'aspa-msg'; }
 
  try {
    const resultado = await verificarCodigo(codigo);
    if (resultado.valido) {
      marcarActivado(codigo.toUpperCase());
      if (msgEl) { msgEl.textContent = '✅ ¡Activado!'; msgEl.className = 'aspa-msg ok'; }
      btn.textContent = '✅ ¡Activado!';
      setTimeout(ocultarGate, 800);
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
 
document.addEventListener('DOMContentLoaded', () => {
  if (yaActivado()) {
    const gate = document.getElementById('aspa-gate');
    if (gate) gate.remove();
    return;
  }
 
  const btn   = document.getElementById('aspa-activar');
  const input = document.getElementById('aspa-codigo');
 
  if (btn)   btn.addEventListener('click', intentarActivar);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') intentarActivar();
    });
    input.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(pos, pos);
      e.target.style.borderColor = '';
    });
  }
});

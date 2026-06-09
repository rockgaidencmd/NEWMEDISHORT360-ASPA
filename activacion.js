/* ============================================================
   MEDISHORT360 - ASPA · Activación por código único
   Verifica el código en Firebase Firestore → colección "codigos_aspa".
   No modifica app.js ni el diseño de la calculadora: solo controla
   la "puerta" (#aspa-gate) que está encima de la app.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getFirestore, doc, getDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

/* ────────────────────────────────────────────────────────────
   TU CONFIGURACIÓN DE FIREBASE (ya completada)
   ──────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyApl919VrDKdV1AdHtZsrVYUCOzym-ZrZs",
  authDomain: "medishort360-f6f20.firebaseapp.com",
  projectId: "medishort360-f6f20",
  storageBucket: "medishort360-f6f20.firebasestorage.app",
  messagingSenderId: "127659670697",
  appId: "1:127659670697:web:b845e760917ba77e253db8",
  measurementId: "G-YB1S88CPYJ"
};

const COLECCION = "codigos_aspa";        // nombre exacto de tu colección
const LS_KEY     = "aspa_activado";       // marca de activación en este dispositivo

/* ────────────────────────────────────────────────────────────
   Referencias al DOM de la puerta
   ──────────────────────────────────────────────────────────── */
const body    = document.body;
const inputEl = document.getElementById("aspa-codigo");
const btnEl   = document.getElementById("aspa-activar");
const msgEl   = document.getElementById("aspa-msg");
const gateEl  = document.getElementById("aspa-gate");

/* ────────────────────────────────────────────────────────────
   Si ya estaba activado en este dispositivo → desbloquear directo
   ──────────────────────────────────────────────────────────── */
if (localStorage.getItem(LS_KEY) === "1") {
  desbloquear(false);
}

/* ────────────────────────────────────────────────────────────
   Inicializar Firebase
   ──────────────────────────────────────────────────────────── */
let db = null;
try {
  const appFb = initializeApp(firebaseConfig);
  db = getFirestore(appFb);
} catch (e) {
  console.error("Error iniciando Firebase:", e);
}

/* ────────────────────────────────────────────────────────────
   Mensajes
   ──────────────────────────────────────────────────────────── */
function mensaje(txt, tipo) {
  msgEl.textContent = txt || "";
  msgEl.className = "aspa-msg" + (tipo ? " " + tipo : "");
}

/* ────────────────────────────────────────────────────────────
   Desbloquear: quita la puerta y muestra la calculadora
   ──────────────────────────────────────────────────────────── */
function desbloquear(conAnimacion = true) {
  if (conAnimacion && gateEl) {
    gateEl.style.opacity = "0";
    setTimeout(() => body.classList.remove("aspa-bloqueada"), 450);
  } else {
    body.classList.remove("aspa-bloqueada");
  }
}

/* ────────────────────────────────────────────────────────────
   Verificar el código contra Firestore.
   Soporta las dos formas más comunes de guardar códigos:
     A) El ID del documento ES el código     → codigos_aspa/ABC123
     B) El código está en un campo "codigo"   → { codigo: "ABC123" }
   Si el documento trae { activo: false }, se rechaza.
   ──────────────────────────────────────────────────────────── */
async function verificarCodigo(code) {
  if (!db) return { ok: false, motivo: "Sin conexión a Firebase." };

  // A) Buscar por ID de documento
  try {
    const snap = await getDoc(doc(db, COLECCION, code));
    if (snap.exists()) return evaluarDoc(snap.data());
  } catch (e) { /* sigue al método B */ }

  // B) Buscar por campo "codigo"
  try {
    const q  = query(collection(db, COLECCION), where("codigo", "==", code));
    const qs = await getDocs(q);
    if (!qs.empty) return evaluarDoc(qs.docs[0].data());
  } catch (e) {
    return { ok: false, motivo: "No se pudo verificar (revisa reglas/conexión)." };
  }

  return { ok: false, motivo: "Código no válido." };
}

function evaluarDoc(data) {
  if (data && data.activo === false) {
    return { ok: false, motivo: "Este código está desactivado." };
  }
  return { ok: true };
}

/* ────────────────────────────────────────────────────────────
   Acción del botón Activar
   ──────────────────────────────────────────────────────────── */
async function activar() {
  const code = (inputEl.value || "").trim();
  if (!code) { mensaje("Escribe tu código.", "error"); inputEl.focus(); return; }

  btnEl.disabled = true;
  mensaje("Verificando…", "ok");

  const r = await verificarCodigo(code);

  if (r.ok) {
    localStorage.setItem(LS_KEY, "1");
    localStorage.setItem("aspa_codigo", code);
    localStorage.setItem("aspa_fecha", new Date().toISOString());
    mensaje("✓ Activado", "ok");
    setTimeout(() => desbloquear(true), 350);
  } else {
    mensaje(r.motivo || "Código no válido.", "error");
    btnEl.disabled = false;
    inputEl.select();
  }
}

/* ────────────────────────────────────────────────────────────
   Eventos
   ──────────────────────────────────────────────────────────── */
btnEl.addEventListener("click", activar);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") activar();
});
window.addEventListener("DOMContentLoaded", () => inputEl && inputEl.focus());

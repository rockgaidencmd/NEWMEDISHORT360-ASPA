/* ============================================================
   MEDISHORT360 - ASPA · Activación por código único
   Verifica el código en Firebase Firestore → colección "codigos_aspa".
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

const COLECCION = "codigos_aspa";
const LS_KEY     = "aspa_activado";

/* ────────────────────────────────────────────────────────────
   Referencias al DOM
   ──────────────────────────────────────────────────────────── */
const inputEl = document.getElementById("aspa-codigo");
const btnEl   = document.getElementById("aspa-activar");
const msgEl   = document.getElementById("aspa-msg");
const gateEl  = document.getElementById("aspa-gate");

/* ────────────────────────────────────────────────────────────
   Si ya estaba activado → ocultar la puerta directo
   ──────────────────────────────────────────────────────────── */
if (localStorage.getItem(LS_KEY) === "1") {
  gateEl.classList.add("hidden");
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
   Desbloquear: oculta la puerta y muestra la calculadora
   ──────────────────────────────────────────────────────────── */
function desbloquear(conAnimacion = true) {
  if (conAnimacion && gateEl) {
    gateEl.style.opacity = "0";
    setTimeout(() => gateEl.classList.add("hidden"), 450);
  } else {
    gateEl.classList.add("hidden");
  }
}

/* ────────────────────────────────────────────────────────────
   Verificar código contra Firestore
   ──────────────────────────────────────────────────────────── */
async function verificarCodigo(code) {
  if (!db) return { ok: false, motivo: "Sin conexión a Firebase." };

  try {
    const snap = await getDoc(doc(db, COLECCION, code));
    if (snap.exists()) return evaluarDoc(snap.data());
  } catch (e) { /* sigue */ }

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
  if (!code) { 
    mensaje("Escribe tu código.", "error"); 
    inputEl.focus(); 
    return; 
  }

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
window.addEventListener("DOMContentLoaded", () => {
  inputEl && inputEl.focus();
});

// ══════════════════════════════════════════════
// MEDISHORT360-ASPA PRO — Sistema de Licencias
// ══════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyApl919VrDKdV1AdHtZsrVYUCOzym-ZrZs",
    authDomain: "medishort360-f6f20.firebaseapp.com",
    projectId: "medishort360-f6f20",
    storageBucket: "medishort360-f6f20.firebasestorage.app",
    messagingSenderId: "127659670697",
    appId: "1:127659670697:web:b845e760917ba77e253db8"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ══════════════════════════════════════════════
// VERIFICAR LICENCIA AL CARGAR
// ══════════════════════════════════════════════
const STORAGE_KEY = "medishort_aspa_licencia";

window.addEventListener('DOMContentLoaded', () => {
    const licenciaGuardada = localStorage.getItem(STORAGE_KEY);
    if (licenciaGuardada) {
        // Ya activó antes — entrar directo
        mostrarApp();
    }
    // Si no tiene licencia, la pantalla de activación ya está visible
});

// ══════════════════════════════════════════════
// ACTIVAR LICENCIA
// ══════════════════════════════════════════════
window.activarLicencia = async function () {
    const correo = document.getElementById('input-correo').value.trim().toLowerCase();
    const codigo = document.getElementById('input-codigo').value.trim().toUpperCase();
    const msg = document.getElementById('msg-activacion');
    const btn = document.getElementById('btn-activar');

    // Validaciones básicas
    if (!correo || !correo.includes('@')) {
        mostrarMsg('❌ Ingresa un correo válido.', 'error'); return;
    }
    if (!codigo || codigo.length < 10) {
        mostrarMsg('❌ Ingresa tu código de activación.', 'error'); return;
    }

    btn.disabled = true;
    mostrarMsg('⏳ Verificando código...', 'loading');

    try {
        // Buscar el código en Firestore
        const codigoRef = doc(db, "codigos_aspa", codigo);
        const codigoSnap = await getDoc(codigoRef);

        if (!codigoSnap.exists()) {
            mostrarMsg('❌ Código no válido. Verifica que lo copiaste bien.', 'error');
            btn.disabled = false; return;
        }

        const data = codigoSnap.data();

        if (data.estado === 'USADO') {
            mostrarMsg('❌ Este código ya fue usado. Contacta soporte por WhatsApp.', 'error');
            btn.disabled = false; return;
        }

        // ✅ Código válido — marcar como usado
        await updateDoc(codigoRef, {
            estado: 'USADO',
            correo: correo,
            fecha_activacion: new Date().toISOString()
        });

        // Guardar en localStorage para no pedir más
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            correo: correo,
            codigo: codigo,
            fecha: new Date().toISOString()
        }));

        mostrarMsg('✅ ¡Activado! Bienvenido/a 🎉', 'ok');

        // Entrar a la app después de 1.5 segundos
        setTimeout(() => mostrarApp(), 1500);

    } catch (e) {
        console.error(e);
        mostrarMsg('❌ Error de conexión. Revisa tu internet e intenta de nuevo.', 'error');
        btn.disabled = false;
    }
};

function mostrarMsg(texto, tipo) {
    const msg = document.getElementById('msg-activacion');
    msg.textContent = texto;
    msg.className = 'msg-act';
    if (tipo === 'ok') msg.classList.add('msg-ok');
    if (tipo === 'error') msg.classList.add('msg-error');
    if (tipo === 'loading') msg.classList.add('msg-loading');
}

function mostrarApp() {
    document.getElementById('pantalla-activacion').style.display = 'none';
    document.getElementById('app-contenido').style.display = 'block';
    iniciarCalculadora();
}

window.mostrarFormActivacion = function () {
    document.getElementById('vista-bienvenida').style.display = 'none';
    document.getElementById('vista-formulario').style.display = 'block';
};

window.mostrarBienvenida = function () {
    document.getElementById('vista-formulario').style.display = 'none';
    document.getElementById('vista-bienvenida').style.display = 'block';
};

// ══════════════════════════════════════════════
// CALCULADORA ORIGINAL (se inicia tras activar)
// ══════════════════════════════════════════════
function iniciarCalculadora() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(error => {
            console.log('SW error:', error);
        });
    }

    const tabBotones = document.querySelectorAll('.tab-boton');
    const contenidoTabs = document.querySelectorAll('.contenido-tab');
    const botonesRapidos = document.querySelectorAll('.boton-rapido');
    const botonCalcularSalina = document.getElementById('boton-calcular-salina');
    const botonCalcularDextrosa = document.getElementById('boton-calcular-dextrosa');
    const botonLimpiar = document.getElementById('boton-limpiar');

    const volumenSalina = document.getElementById('volumen-salina');
    const concentracionSalina = document.getElementById('concentracion-salina');
    const volumenDextrosa = document.getElementById('volumen-dextrosa');
    const concentracionDextrosa = document.getElementById('concentracion-dextrosa');
    const resultadoSalina = document.getElementById('resultado-salina');
    const resultadoDextrosa = document.getElementById('resultado-dextrosa');

    // TABS
    tabBotones.forEach(boton => {
        boton.addEventListener('click', () => {
            const tabActual = boton.getAttribute('data-tab');
            tabBotones.forEach(b => b.classList.remove('activo'));
            contenidoTabs.forEach(contenido => contenido.classList.remove('activo'));
            boton.classList.add('activo');
            document.getElementById(tabActual).classList.add('activo');
            resultadoSalina.innerHTML = '';
            resultadoSalina.classList.remove('mostrar');
            resultadoDextrosa.innerHTML = '';
            resultadoDextrosa.classList.remove('mostrar');
        });
    });

    // BOTONES RAPIDOS
    botonesRapidos.forEach(boton => {
        boton.addEventListener('click', (e) => {
            e.preventDefault();
            const valor = boton.getAttribute('data-valor');
            const padre = boton.closest('.grupo-entrada');
            if (padre.textContent.includes('Solucion')) {
                concentracionSalina.value = valor;
                const botonesGrupo = padre.querySelectorAll('.boton-rapido');
                botonesGrupo.forEach(b => b.classList.remove('activo'));
                boton.classList.add('activo');
            } else {
                concentracionDextrosa.value = valor;
                const botonesGrupo = padre.querySelectorAll('.boton-rapido');
                botonesGrupo.forEach(b => b.classList.remove('activo'));
                boton.classList.add('activo');
            }
        });
    });

    // CALCULAR SALINA
    botonCalcularSalina.addEventListener('click', (e) => {
        e.preventDefault();
        const volumen = parseFloat(volumenSalina.value);
        const concentracion = parseFloat(concentracionSalina.value);
        if (!volumen || !concentracion || volumen <= 0 || concentracion < 0) {
            mostrarError(resultadoSalina, 'Ingresa valores validos'); return;
        }
        const gramosNaCl = (volumen * concentracion) / 100;
        const miligramosSoluto = gramosNaCl * 1000;
        const miliequivalentes = (concentracion / 0.585) * (volumen / 1000);
        let indicacion = '';
        if (concentracion <= 0.9) indicacion = 'Solucion hipotonica - Deshidratacion hipertonica';
        else if (concentracion <= 3) indicacion = 'Solucion isotonica - Mantenimiento e hidratacion';
        else if (concentracion <= 7) indicacion = 'Solucion hipertonica - Edema cerebral, choque';
        else indicacion = 'Solucion muy hipertonica - Emergencias, hiponatremia severa';

        mostrarResultado(resultadoSalina, `
            <h3>Resultado - Solucion Salina</h3>
            <div class="valor-principal">${gramosNaCl.toFixed(2)} g NaCl</div>
            <p><strong>Volumen:</strong> ${volumen} mL</p>
            <p><strong>Concentracion:</strong> ${concentracion}%</p>
            <div class="detalles">
                <p><strong>Equivalentes:</strong> ${miliequivalentes.toFixed(2)} mEq</p>
                <p><strong>Miligramos:</strong> ${miligramosSoluto.toFixed(0)} mg</p>
                <p style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.15)">
                    <strong>Indicacion:</strong> ${indicacion}
                </p>
            </div>
        `);
    });

    // CALCULAR DEXTROSA
    botonCalcularDextrosa.addEventListener('click', (e) => {
        e.preventDefault();
        const volumen = parseFloat(volumenDextrosa.value);
        const concentracion = parseFloat(concentracionDextrosa.value);
        if (!volumen || !concentracion || volumen <= 0 || concentracion < 0) {
            mostrarError(resultadoDextrosa, 'Ingresa valores validos'); return;
        }
        const gramosDextrosa = (volumen * concentracion) / 100;
        const calorias = gramosDextrosa * 3.4;
        const osmolaridad = (concentracion * 10) + 254;
        let indicacion = '';
        if (concentracion <= 5) indicacion = 'Dextrosa baja - Hidratacion y mantenimiento';
        else if (concentracion <= 10) indicacion = 'Dextrosa moderada - Soporte nutricional';
        else if (concentracion <= 50) indicacion = 'Dextrosa alta - Nutricion parenteral, hipoglucemia severa';
        else indicacion = 'Dextrosa muy concentrada - Emergencias, reanimacion';

        mostrarResultado(resultadoDextrosa, `
            <h3>Resultado - Dextrosa</h3>
            <div class="valor-principal">${gramosDextrosa.toFixed(2)} g Dextrosa</div>
            <p><strong>Volumen:</strong> ${volumen} mL</p>
            <p><strong>Concentracion:</strong> ${concentracion}%</p>
            <div class="detalles">
                <p><strong>Calorias aportadas:</strong> ${calorias.toFixed(0)} kcal</p>
                <p><strong>Osmolaridad aprox:</strong> ${osmolaridad.toFixed(0)} mOsm/L</p>
                <p style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.15)">
                    <strong>Indicacion:</strong> ${indicacion}
                </p>
            </div>
        `);
    });

    // LIMPIAR
    botonLimpiar.addEventListener('click', (e) => {
        e.preventDefault();
        volumenSalina.value = '';
        concentracionSalina.value = '';
        volumenDextrosa.value = '';
        concentracionDextrosa.value = '';
        resultadoSalina.innerHTML = '';
        resultadoSalina.classList.remove('mostrar');
        resultadoDextrosa.innerHTML = '';
        resultadoDextrosa.classList.remove('mostrar');
        document.querySelectorAll('.boton-rapido').forEach(b => b.classList.remove('activo'));
    });

    document.addEventListener('touchmove', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.classList.contains('boton-rapido')) {
            e.stopPropagation();
        }
    }, { passive: true });

    if (tabBotones.length > 0) tabBotones[0].click();
    window.addEventListener('online', () => console.log('Online'));
    window.addEventListener('offline', () => console.log('Offline'));
}

function mostrarResultado(elemento, html) {
    elemento.innerHTML = html;
    elemento.classList.add('mostrar');
    elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mostrarError(elemento, mensaje) {
    elemento.innerHTML = `<h3>Error</h3><p style="color:#ff6b6b">${mensaje}</p>`;
    elemento.classList.add('mostrar');
}

// ══════════════════════════════════════════════
// MEDISHORT360-ASPA PRO — Firebase Licencias
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

// ══ VERIFICAR CÓDIGO EN FIREBASE ══
window.actActivar = async function () {
    const correo = document.getElementById('act-correo').value.trim().toLowerCase();
    const codigo = document.getElementById('act-codigo').value.trim().toUpperCase();
    const btn = document.getElementById('act-btn-activar');

    if (!correo || !correo.includes('@')) {
        window.actSetMsg('❌ Ingresa un correo válido.', 'err'); return;
    }
    if (!codigo || codigo.length < 10) {
        window.actSetMsg('❌ Ingresa tu código de activación.', 'err'); return;
    }

    btn.disabled = true;
    window.actSetMsg('⏳ Verificando código...', 'wait');

    try {
        const codigoRef = doc(db, "codigos_aspa", codigo);
        const codigoSnap = await getDoc(codigoRef);

        if (!codigoSnap.exists()) {
            window.actSetMsg('❌ Código no válido. Verifica que lo copiaste bien.', 'err');
            btn.disabled = false; return;
        }

        const data = codigoSnap.data();

        if (data.estado === 'USADO') {
            window.actSetMsg('❌ Este código ya fue usado. Contacta soporte por WhatsApp.', 'err');
            btn.disabled = false; return;
        }

        // ✅ Código válido — marcarlo como usado
        await updateDoc(codigoRef, {
            estado: 'USADO',
            correo: correo,
            fecha_activacion: new Date().toISOString()
        });

        // Avisar al index.html que active la app
        window.onLicenciaActivada(correo, codigo);

    } catch (e) {
        console.error(e);
        window.actSetMsg('❌ Error de conexión. Revisa tu internet e intenta de nuevo.', 'err');
        btn.disabled = false;
    }
};

// ══ CALCULADORA ORIGINAL — se inicia cuando el div app-contenido es visible ══
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.style.display !== 'none') {
            iniciarCalculadora();
            observer.disconnect();
        }
    });
});

const appDiv = document.getElementById('app-contenido');
if (appDiv) {
    observer.observe(appDiv, { attributes: true, attributeFilter: ['style'] });
    // Si ya está visible (localStorage activo)
    if (appDiv.style.display !== 'none') iniciarCalculadora();
}

function iniciarCalculadora() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(e => console.log('SW:', e));
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

    tabBotones.forEach(boton => {
        boton.addEventListener('click', () => {
            const tabActual = boton.getAttribute('data-tab');
            tabBotones.forEach(b => b.classList.remove('activo'));
            contenidoTabs.forEach(c => c.classList.remove('activo'));
            boton.classList.add('activo');
            document.getElementById(tabActual).classList.add('activo');
            resultadoSalina.innerHTML = '';
            resultadoSalina.classList.remove('mostrar');
            resultadoDextrosa.innerHTML = '';
            resultadoDextrosa.classList.remove('mostrar');
        });
    });

    botonesRapidos.forEach(boton => {
        boton.addEventListener('click', (e) => {
            e.preventDefault();
            const valor = boton.getAttribute('data-valor');
            const padre = boton.closest('.grupo-entrada');
            if (padre.textContent.includes('Solucion')) {
                concentracionSalina.value = valor;
                padre.querySelectorAll('.boton-rapido').forEach(b => b.classList.remove('activo'));
                boton.classList.add('activo');
            } else {
                concentracionDextrosa.value = valor;
                padre.querySelectorAll('.boton-rapido').forEach(b => b.classList.remove('activo'));
                boton.classList.add('activo');
            }
        });
    });

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

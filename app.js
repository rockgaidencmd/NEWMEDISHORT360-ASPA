// Registrar Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(error => {
        console.log('SW error:', error);
    });
}

// ELEMENTOS DOM
const tabBotones = document.querySelectorAll('.tab-boton');
const contenidoTabs = document.querySelectorAll('.contenido-tab');
const botonesRapidos = document.querySelectorAll('.boton-rapido');
const botonCalcularSalina = document.getElementById('boton-calcular-salina');
const botonCalcularDextrosa = document.getElementById('boton-calcular-dextrosa');
const botonLimpiar = document.getElementById('boton-limpiar');

// INPUTS
const volumenSalina = document.getElementById('volumen-salina');
const concentracionSalina = document.getElementById('concentracion-salina');
const volumenDextrosa = document.getElementById('volumen-dextrosa');
const concentracionDextrosa = document.getElementById('concentracion-dextrosa');

// RESULTADOS
const resultadoSalina = document.getElementById('resultado-salina');
const resultadoDextrosa = document.getElementById('resultado-dextrosa');

// FUNCIONALIDAD TABS
tabBotones.forEach(boton => {
    boton.addEventListener('click', () => {
        const tabActual = boton.getAttribute('data-tab');

        // Remover activo de todos
        tabBotones.forEach(b => b.classList.remove('activo'));
        contenidoTabs.forEach(contenido => contenido.classList.remove('activo'));

        // Activar seleccionado
        boton.classList.add('activo');
        document.getElementById(tabActual).classList.add('activo');

        // Limpiar resultados
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
        
        // Determinar si es salina o dextrosa
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

// CALCULAR SOLUCION SALINA
botonCalcularSalina.addEventListener('click', (e) => {
    e.preventDefault();
    const volumen = parseFloat(volumenSalina.value);
    const concentracion = parseFloat(concentracionSalina.value);

    if (!volumen || !concentracion || volumen <= 0 || concentracion < 0) {
        mostrarError(resultadoSalina, 'Ingresa valores validos');
        return;
    }

    // Calculos
    const gramosNaCl = (volumen * concentracion) / 100;
    const miligramosSoluto = gramosNaCl * 1000;
    const miliequivalentes = (concentracion / 0.585) * (volumen / 1000);

    let indicacion = '';
    if (concentracion <= 0.9) {
        indicacion = 'Solucion hipotonica - Deshidratacion hipertonica';
    } else if (concentracion <= 3) {
        indicacion = 'Solucion isotonica - Mantenimiento e hidratacion';
    } else if (concentracion <= 7) {
        indicacion = 'Solucion hipertonica - Edema cerebral, choque';
    } else {
        indicacion = 'Solucion muy hipertonica - Emergencias, hiponatremia severa';
    }

    const html = `
        <h3>Resultado - Solucion Salina</h3>
        <div class="valor-principal">${gramosNaCl.toFixed(2)} g NaCl</div>
        <p><strong>Volumen:</strong> ${volumen} mL</p>
        <p><strong>Concentracion:</strong> ${concentracion}%</p>
        <div class="detalles">
            <p><strong>Equivalentes:</strong> ${miliequivalentes.toFixed(2)} mEq</p>
            <p><strong>Miligramos:</strong> ${miligramosSoluto.toFixed(0)} mg</p>
            <p style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15);">
                <strong>Indicacion:</strong> ${indicacion}
            </p>
        </div>
    `;

    mostrarResultado(resultadoSalina, html);
});

// CALCULAR DEXTROSA
botonCalcularDextrosa.addEventListener('click', (e) => {
    e.preventDefault();
    const volumen = parseFloat(volumenDextrosa.value);
    const concentracion = parseFloat(concentracionDextrosa.value);

    if (!volumen || !concentracion || volumen <= 0 || concentracion < 0) {
        mostrarError(resultadoDextrosa, 'Ingresa valores validos');
        return;
    }

    // Calculos
    const gramosDextrosa = (volumen * concentracion) / 100;
    const calorias = gramosDextrosa * 3.4;
    const osmolaridad = (concentracion * 10) + 254;

    let indicacion = '';
    if (concentracion <= 5) {
        indicacion = 'Dextrosa baja - Hidratacion y mantenimiento';
    } else if (concentracion <= 10) {
        indicacion = 'Dextrosa moderada - Soporte nutricional';
    } else if (concentracion <= 50) {
        indicacion = 'Dextrosa alta - Nutricion parenteral, hipoglucemia severa';
    } else {
        indicacion = 'Dextrosa muy concentrada - Emergencias, reanimacion';
    }

    const html = `
        <h3>Resultado - Dextrosa</h3>
        <div class="valor-principal">${gramosDextrosa.toFixed(2)} g Dextrosa</div>
        <p><strong>Volumen:</strong> ${volumen} mL</p>
        <p><strong>Concentracion:</strong> ${concentracion}%</p>
        <div class="detalles">
            <p><strong>Calorias aportadas:</strong> ${calorias.toFixed(0)} kcal</p>
            <p><strong>Osmolaridad aprox:</strong> ${osmolaridad.toFixed(0)} mOsm/L</p>
            <p style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15);">
                <strong>Indicacion:</strong> ${indicacion}
            </p>
        </div>
    `;

    mostrarResultado(resultadoDextrosa, html);
});

// FUNCIONES AUXILIARES
function mostrarResultado(elemento, html) {
    elemento.innerHTML = html;
    elemento.classList.add('mostrar');
    elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mostrarError(elemento, mensaje) {
    elemento.innerHTML = `
        <h3>Error de Validacion</h3>
        <p style="color: #ff6b6b;">${mensaje}</p>
    `;
    elemento.classList.add('mostrar');
}

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

// Prevent default y mantener teclado abierto
document.addEventListener('touchmove', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.classList.contains('boton-rapido')) {
        e.stopPropagation();
    }
}, { passive: true });

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('MEDISHORT360-ASPA Iniciada');
    if (tabBotones.length > 0) {
        tabBotones[0].click();
    }
});

// Online/Offline
window.addEventListener('online', () => console.log('Online'));
window.addEventListener('offline', () => console.log('Offline'));

// logica-acceso.js — lógica pura de acceso (sin DOM, red ni Firebase)
// "ahoraMs" se recibe siempre como parámetro para pruebas deterministas.

const DIA_MS = 24 * 60 * 60 * 1000;

// Acceso vigente: trial o activo (o cancelado aún no vencido) y fecha no expirada.
export function tieneAcceso(perfil, ahoraMs) {
  if (!perfil || !perfil.acceso_hasta) return false;
  const estadosConAcceso = ['trial', 'active', 'canceled'];
  if (!estadosConAcceso.includes(perfil.status)) return false;
  return ahoraMs < Date.parse(perfil.acceso_hasta);
}

// Nueva fecha de acceso al pagar/renovar un plan, contada desde "desdeMs".
export function calcularAccesoHasta(plan, desdeMs, config) {
  const def = config.PLANES[plan];
  if (!def) throw new Error(`Plan desconocido: ${plan}`);
  const d = new Date(desdeMs);
  const mesObjetivo = d.getUTCMonth() + def.meses;
  d.setUTCMonth(mesObjetivo);
  // Si el día se desbordó a otro mes (ej. 31 ene -> 3 mar), retroceder al
  // último día del mes que correspondía.
  const mesEsperado = ((mesObjetivo % 12) + 12) % 12;
  if (d.getUTCMonth() !== mesEsperado) d.setUTCDate(0);
  return d.getTime();
}

// Perfil inicial de prueba gratis.
export function nuevoTrial(config, ahoraMs) {
  return {
    status: 'trial',
    plan: null,
    acceso_hasta: new Date(ahoraMs + config.TRIAL_DIAS * DIA_MS).toISOString(),
  };
}

// ¿El perfil cacheado offline aún está dentro del margen de gracia?
export function dentroDeGracia(perfilCacheado, ahoraMs, config) {
  if (!perfilCacheado || !perfilCacheado.acceso_hasta) return false;
  const limite = Date.parse(perfilCacheado.acceso_hasta) + config.GRACIA_OFFLINE_DIAS * DIA_MS;
  return ahoraMs < limite;
}

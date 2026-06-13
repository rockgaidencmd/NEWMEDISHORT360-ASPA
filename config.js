// config.js — perillas ajustables (sin secretos)
// Cambiar un valor aquí lo actualiza en navegador y backend.
export const CONFIG = {
  // SOLO DESARROLLO: si es true, salta el login/paywall y muestra la app directo.
  // DEBE ser false en producción (se valida en la checklist final del plan).
  DEV_BYPASS_ACCESO: false,
  TRIAL_DIAS: 7,              // duración de la prueba gratis
  GRACIA_OFFLINE_DIAS: 7,     // días de uso offline antes de exigir revalidación
  REVALIDAR_CADA_HORAS: 24,   // cada cuánto la app revalida online
  PLANES: {
    mensual: { label: 'Mensual', precio: '5.00',  meses: 1,  paypal_plan_id: 'P-REEMPLAZAR-MENSUAL' },
    anual:   { label: 'Anual',   precio: '40.00', meses: 12, paypal_plan_id: 'P-REEMPLAZAR-ANUAL' },
  },
};

// logica-acceso.test.js
import { describe, it, expect } from 'vitest';
import {
  tieneAcceso, calcularAccesoHasta, nuevoTrial, dentroDeGracia,
} from './logica-acceso.js';

const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.parse('2026-06-11T12:00:00Z');

describe('tieneAcceso', () => {
  it('da acceso a trial vigente', () => {
    const perfil = { status: 'trial', acceso_hasta: new Date(AHORA + DIA).toISOString() };
    expect(tieneAcceso(perfil, AHORA)).toBe(true);
  });

  it('da acceso a suscripción activa vigente', () => {
    const perfil = { status: 'active', acceso_hasta: new Date(AHORA + DIA).toISOString() };
    expect(tieneAcceso(perfil, AHORA)).toBe(true);
  });

  it('niega acceso si acceso_hasta ya venció', () => {
    const perfil = { status: 'active', acceso_hasta: new Date(AHORA - DIA).toISOString() };
    expect(tieneAcceso(perfil, AHORA)).toBe(false);
  });

  it('niega acceso a status canceled aunque la fecha no haya vencido es decisión de la fecha', () => {
    // canceled sigue dando acceso hasta que acceso_hasta venza
    const vigente = { status: 'canceled', acceso_hasta: new Date(AHORA + DIA).toISOString() };
    const vencido = { status: 'canceled', acceso_hasta: new Date(AHORA - DIA).toISOString() };
    expect(tieneAcceso(vigente, AHORA)).toBe(true);
    expect(tieneAcceso(vencido, AHORA)).toBe(false);
  });

  it('niega acceso si el perfil es nulo o sin fecha', () => {
    expect(tieneAcceso(null, AHORA)).toBe(false);
    expect(tieneAcceso({ status: 'trial' }, AHORA)).toBe(false);
  });
});

describe('calcularAccesoHasta', () => {
  const config = { PLANES: { mensual: { meses: 1 }, anual: { meses: 12 } } };

  it('extiende un mes para el plan mensual', () => {
    const r = calcularAccesoHasta('mensual', AHORA, config);
    expect(r).toBe(new Date('2026-07-11T12:00:00Z').getTime());
  });

  it('extiende doce meses para el plan anual', () => {
    const r = calcularAccesoHasta('anual', AHORA, config);
    expect(r).toBe(new Date('2027-06-11T12:00:00Z').getTime());
  });

  it('lanza error si el plan no existe', () => {
    expect(() => calcularAccesoHasta('semanal', AHORA, config)).toThrow();
  });
});

describe('nuevoTrial', () => {
  it('crea un perfil trial con acceso_hasta a TRIAL_DIAS de hoy', () => {
    const config = { TRIAL_DIAS: 7 };
    const perfil = nuevoTrial(config, AHORA);
    expect(perfil.status).toBe('trial');
    expect(perfil.plan).toBe(null);
    expect(Date.parse(perfil.acceso_hasta)).toBe(AHORA + 7 * DIA);
  });
});

describe('dentroDeGracia', () => {
  const config = { GRACIA_OFFLINE_DIAS: 7 };

  it('permite uso offline si acceso_hasta venció hace menos que la gracia', () => {
    const perfil = { acceso_hasta: new Date(AHORA - 3 * DIA).toISOString() };
    expect(dentroDeGracia(perfil, AHORA, config)).toBe(true);
  });

  it('bloquea si acceso_hasta venció hace más que la gracia', () => {
    const perfil = { acceso_hasta: new Date(AHORA - 10 * DIA).toISOString() };
    expect(dentroDeGracia(perfil, AHORA, config)).toBe(false);
  });

  it('bloquea si no hay perfil cacheado', () => {
    expect(dentroDeGracia(null, AHORA, config)).toBe(false);
  });
});

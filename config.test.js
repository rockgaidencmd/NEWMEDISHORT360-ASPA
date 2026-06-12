// config.test.js
import { describe, it, expect } from 'vitest';
import { CONFIG } from './config.js';

describe('CONFIG', () => {
  it('expone los días de trial y gracia como números positivos', () => {
    expect(CONFIG.TRIAL_DIAS).toBeGreaterThan(0);
    expect(CONFIG.GRACIA_OFFLINE_DIAS).toBeGreaterThan(0);
  });

  it('define los planes mensual y anual con plan_id de PayPal', () => {
    expect(CONFIG.PLANES.mensual.paypal_plan_id).toBeTruthy();
    expect(CONFIG.PLANES.anual.paypal_plan_id).toBeTruthy();
  });
});

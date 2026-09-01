import { describe, it, expect } from 'vitest';
import {
  calculateWorkCost,
  simulatePurchaseImpact,
  calculateCoolingOffProgress,
} from '@/lib/insights/purchase-simulator';

describe('Purchase Simulator & Impulse Shield Engine', () => {
  describe('calculateWorkCost', () => {
    it('calculates hourly rate and hours/days needed for 6h/day jornada', () => {
      // Monthly income R$ 5000 -> 22 days * 6h = 132h/month -> R$ 37.88/h
      // Item cost R$ 378.80 -> 10.0h -> 1.7 days (at 6h/day)
      const res = calculateWorkCost(378.80, 5000, 6, 22);
      expect(res.hourlyRate).toBe(37.88);
      expect(res.hoursNeeded).toBe(10.0);
      expect(res.daysNeeded).toBe(1.7);
      expect(res.workCostMessage).toContain('1.7 dias (10h) de trabalho');
    });

    it('calculates hourly rate and hours/days needed for 8h/day jornada', () => {
      // Monthly income R$ 5000 -> 20 days * 8h = 160h/month = R$ 31.25/h
      // Item cost R$ 250 -> 250 / 31.25 = 8.0h (1.0 day at 8h/day)
      const res = calculateWorkCost(250, 5000, 8, 20);
      expect(res.hourlyRate).toBe(31.25);
      expect(res.hoursNeeded).toBe(8.0);
      expect(res.daysNeeded).toBe(1.0);
      expect(res.workCostMessage).toContain('1 dias (8h) de trabalho');
    });

    it('handles zero or negative income gracefully without crashing', () => {
      const res = calculateWorkCost(100, 0, 6);
      expect(res.hourlyRate).toBe(0);
      expect(res.hoursNeeded).toBe(0);
      expect(res.workCostMessage).toBe('Renda não informada');
    });
  });

  describe('simulatePurchaseImpact', () => {
    it('simulates low impact for safe small purchases', () => {
      const sim = simulatePurchaseImpact({
        price: 30,
        monthlyIncome: 5000,
        variableBudgetLimit: 2200,
        totalFixedSpent: 1500,
        totalVariableSpent: 200,
        currentDayOfMonth: 10,
        totalDaysInMonth: 30,
        currentHp: 100,
      });

      expect(sim.hpDrop).toBeLessThanOrEqual(5);
      expect(sim.verdict).toBe('SAFE');
      expect(sim.simulatedHpResult.hp).toBeGreaterThanOrEqual(90);
    });

    it('detects danger when a huge purchase destroys HP', () => {
      const sim = simulatePurchaseImpact({
        price: 2500,
        monthlyIncome: 5000,
        variableBudgetLimit: 2200,
        totalFixedSpent: 1500,
        totalVariableSpent: 1000,
        currentDayOfMonth: 10,
        totalDaysInMonth: 30,
        currentHp: 100,
      });

      expect(sim.verdict).toBe('DANGER');
      expect(sim.simulatedHpResult.hp).toBeLessThanOrEqual(40);
      expect(sim.simulatedHpResult.mood).toBe('PANIC');
    });
  });

  describe('calculateCoolingOffProgress', () => {
    it('calculates progress accurately for recent vs 30-day old items', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

      const progress10Days = calculateCoolingOffProgress(recentDate, 30);
      expect(progress10Days.elapsedDays).toBe(10);
      expect(progress10Days.remainingDays).toBe(20);
      expect(progress10Days.isReady).toBe(false);

      const oldDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 days ago
      const progress35Days = calculateCoolingOffProgress(oldDate, 30);
      expect(progress35Days.remainingDays).toBe(0);
      expect(progress35Days.percentage).toBe(100);
      expect(progress35Days.isReady).toBe(true);
    });
  });
});

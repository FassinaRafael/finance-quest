import { describe, it, expect } from 'vitest';
import { parseExpenseText } from '@/lib/telegram/parser';
import { escapeTelegramMarkdown } from '@/lib/telegram/client';
import { DEFAULT_CATEGORIES } from '@/lib/storage/default-data';

describe('telegram/parser (Natural Language Expense Parser & Security)', () => {
  it('should parse simple "35 uber" to Transport with variable cost', () => {
    const parsed = parseExpenseText('35 uber', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(35);
    expect(parsed?.matchedCategoryName).toBe('Transporte');
    expect(parsed?.isFixed).toBe(false);
    expect(parsed?.type).toBe('EXPENSE');
  });

  it('should prevent alias collision when word contains short alias as substring', () => {
    // "gastei" contains "gas" (Moradia/Contas alias), but user bought at "mercado" (Alimentação)
    const parsed = parseExpenseText('gastei 50 no mercado', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(50);
    expect(parsed?.matchedCategoryName).toBe('Alimentação'); // Must NOT be Moradia & Contas
  });

  it('should prioritize the actual price over quantity in phrases with multiple numbers', () => {
    // "2 pizzas por 80" -> Amount should be 80.00
    const parsed = parseExpenseText('comprei 2 pizzas por 80', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(80);
    expect(parsed?.matchedCategoryName).toBe('Alimentação');
  });

  it('should parse currency format "R$ 12,50 cafezinho" to Food', () => {
    const parsed = parseExpenseText('R$ 12,50 cafezinho', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(12.5);
    expect(parsed?.matchedCategoryName).toBe('Alimentação');
    expect(parsed?.isFixed).toBe(false);
  });

  it('should recognize fixed cost modifier "150 internet fixo" as isFixed: true', () => {
    const parsed = parseExpenseText('150 internet fixo', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(150);
    expect(parsed?.matchedCategoryName).toBe('Moradia & Contas');
    expect(parsed?.isFixed).toBe(true);
  });

  it('should inherit category isFixedCost = true by default for housing bills', () => {
    const parsed = parseExpenseText('800 aluguel', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(800);
    expect(parsed?.matchedCategoryName).toBe('Moradia & Contas');
    expect(parsed?.isFixed).toBe(true);
  });

  it('should handle pure number "45" with fallback to Outros / Não Categorizado', () => {
    const parsed = parseExpenseText('45', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(45);
    expect(parsed?.matchedCategoryName).toBe('Outros / Não Categorizado');
    expect(parsed?.confidence).toBe('FALLBACK');
  });

  it('should parse income terms like "3500 salario" with type INCOME', () => {
    const parsed = parseExpenseText('3500 salario', DEFAULT_CATEGORIES);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(3500);
    expect(parsed?.type).toBe('INCOME');
  });

  it('should return null on invalid non-numeric text', () => {
    const parsed = parseExpenseText('boa noite amigos', DEFAULT_CATEGORIES);
    expect(parsed).toBeNull();
  });

  it('should escape Telegram markdown special characters properly', () => {
    const dangerous = '35 uber_x (plano *turbo*) [vip]';
    const escaped = escapeTelegramMarkdown(dangerous);
    expect(escaped).toBe('35 uber\\_x \\(plano \\*turbo\\*\\) \\[vip\\]');
  });
});

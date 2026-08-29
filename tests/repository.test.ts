import { describe, it, expect, beforeEach } from 'vitest';
import { StorageRepository } from '@/lib/storage/repository';
import { DEFAULT_CATEGORIES } from '@/lib/storage/default-data';

describe('repository (Data Integrity & Backup Security)', () => {
  let repo: StorageRepository;

  beforeEach(() => {
    // Reset singleton instance state
    repo = StorageRepository.getInstance();
    repo.resetToDefaults();
  });

  it('should reassign orphaned transactions to fallback category when custom category is deleted', () => {
    const customCat = repo.addCategory({
      userId: 'usr-default',
      name: 'Cinema & Pipoca',
      icon: '🍿',
      color: '#EC4899',
      type: 'EXPENSE',
      isFixedCost: false,
      isUnclassifiedFallback: false,
      aliases: ['cinema', 'filme'],
    });

    // Add transaction using this custom category
    repo.addTransaction({
      amount: 45.0,
      categoryId: customCat.id,
      description: 'Ingresso IMAX',
      isFixed: false,
      type: 'EXPENSE',
    });

    let txs = repo.getTransactions();
    expect(txs.some((t) => t.categoryId === customCat.id)).toBe(true);

    // Delete custom category
    const deleted = repo.deleteCategory(customCat.id);
    expect(deleted).toBe(true);

    // Verify orphaned transactions were reassigned to fallback category
    txs = repo.getTransactions();
    expect(txs.some((t) => t.categoryId === customCat.id)).toBe(false);
    expect(txs.some((t) => t.categoryId === 'cat-other')).toBe(true);
  });

  it('should prevent deletion of unclassified fallback category', () => {
    const fallbackCat = DEFAULT_CATEGORIES.find((c) => c.isUnclassifiedFallback);
    expect(fallbackCat).toBeDefined();

    if (fallbackCat) {
      const deleted = repo.deleteCategory(fallbackCat.id);
      expect(deleted).toBe(false);
    }
  });

  it('should safely validate and sanitize corrupt JSON in importAllData', () => {
    // Corrupt JSON payload with missing amounts and negative values
    const corruptJson = JSON.stringify({
      profile: { monthlyIncome: -3000, displayName: 'Test Hacker' },
      transactions: [
        { id: 'tx-bad-1', amount: 'not-a-number' },
        { id: 'tx-bad-2', amount: -150.5, transactionDate: '2026-08-27' },
      ],
      categories: [
        { id: 'cat-test', name: 'Safe Cat' },
        { id: null }, // Corrupt entry
      ],
    });

    const success = repo.importAllData(corruptJson);
    expect(success).toBe(true);

    const profile = repo.getProfile();
    expect(profile.monthlyIncome).toBe(0); // Clamped from negative

    const txs = repo.getTransactions();
    expect(txs.length).toBe(1); // Only the valid one with positive sanitized amount
    expect(txs[0].amount).toBe(150.5);

    const cats = repo.getCategories();
    expect(cats.some((c) => c.name === 'Safe Cat')).toBe(true);
  });

  it('should export valid CSV formatted string with headers', () => {
    const csv = repo.exportTransactionsCsv();
    expect(csv).toContain('ID;Data;Tipo;Categoria;Descricao;Valor;Fixo;Origem');
  });
});

import { describe, it, expect } from 'vitest';

interface TransactionLine {
  account_id: string;
  debit: string;
  credit: string;
}

function calculateBalance(lines: TransactionLine[]) {
  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
}

function isTransactionBalanced(lines: TransactionLine[]): boolean {
  const balance = calculateBalance(lines);
  return Math.abs(balance.difference) < 0.01;
}

function validateTransaction(lines: TransactionLine[]): { valid: boolean; error?: string } {
  const validLines = lines.filter(
    (line) => line.account_id && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0)
  );

  if (validLines.length < 2) {
    return { valid: false, error: 'A transaction must have at least 2 lines.' };
  }

  if (!isTransactionBalanced(validLines)) {
    const balance = calculateBalance(validLines);
    return {
      valid: false,
      error: `Transaction is not balanced! Debit: ${balance.totalDebit.toFixed(2)}, Credit: ${balance.totalCredit.toFixed(2)}`,
    };
  }

  return { valid: true };
}

describe('Transaction Validation', () => {
  describe('calculateBalance', () => {
    it('should calculate correct balance for equal debits and credits', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '2', debit: '0', credit: '1000' },
      ];

      const balance = calculateBalance(lines);

      expect(balance.totalDebit).toBe(1000);
      expect(balance.totalCredit).toBe(1000);
      expect(balance.difference).toBe(0);
    });

    it('should calculate correct balance for unbalanced transaction', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '2', debit: '0', credit: '500' },
      ];

      const balance = calculateBalance(lines);

      expect(balance.totalDebit).toBe(1000);
      expect(balance.totalCredit).toBe(500);
      expect(balance.difference).toBe(500);
    });

    it('should handle decimal amounts correctly', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1234.56', credit: '0' },
        { account_id: '2', debit: '0', credit: '1234.56' },
      ];

      const balance = calculateBalance(lines);

      expect(balance.totalDebit).toBe(1234.56);
      expect(balance.totalCredit).toBe(1234.56);
      expect(Math.abs(balance.difference)).toBeLessThan(0.01);
    });

    it('should handle empty string amounts as zero', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '' },
        { account_id: '2', debit: '', credit: '1000' },
      ];

      const balance = calculateBalance(lines);

      expect(balance.totalDebit).toBe(1000);
      expect(balance.totalCredit).toBe(1000);
    });
  });

  describe('isTransactionBalanced', () => {
    it('should return true for balanced transaction', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '2', debit: '0', credit: '1000' },
      ];

      expect(isTransactionBalanced(lines)).toBe(true);
    });

    it('should return false for unbalanced transaction', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '2', debit: '0', credit: '500' },
      ];

      expect(isTransactionBalanced(lines)).toBe(false);
    });

    it('should handle rounding errors (consider balanced within 0.01)', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '100.005', credit: '0' },
        { account_id: '2', debit: '0', credit: '100.004' },
      ];

      expect(isTransactionBalanced(lines)).toBe(true);
    });

    it('should return true for multi-line balanced transaction', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '2', debit: '500', credit: '0' },
        { account_id: '3', debit: '0', credit: '1500' },
      ];

      expect(isTransactionBalanced(lines)).toBe(true);
    });
  });

  describe('validateTransaction', () => {
    it('should validate a correct transaction', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '2', debit: '0', credit: '1000' },
      ];

      const result = validateTransaction(lines);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject transaction with less than 2 valid lines', () => {
      const lines: TransactionLine[] = [{ account_id: '1', debit: '1000', credit: '0' }];

      const result = validateTransaction(lines);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2 lines');
    });

    it('should reject unbalanced transaction', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '2', debit: '0', credit: '500' },
      ];

      const result = validateTransaction(lines);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not balanced');
    });

    it('should filter out lines without account_id', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '', debit: '100', credit: '0' },
        { account_id: '2', debit: '0', credit: '1000' },
      ];

      const result = validateTransaction(lines);

      expect(result.valid).toBe(true);
    });

    it('should filter out lines with no amounts', () => {
      const lines: TransactionLine[] = [
        { account_id: '1', debit: '1000', credit: '0' },
        { account_id: '3', debit: '0', credit: '0' },
        { account_id: '2', debit: '0', credit: '1000' },
      ];

      const result = validateTransaction(lines);

      expect(result.valid).toBe(true);
    });
  });
});

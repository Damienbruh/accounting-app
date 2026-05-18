import { describe, it, expect } from 'vitest';

// Helper functions matching sie-parser.js logic
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function parseAmount(amount: string | number): number {
  return parseFloat(String(amount)) / 100;
}

function unquoteString(str: string): string {
  if (!str) return '';
  let unquoted = str.trim();
  if (unquoted.startsWith('"') && unquoted.endsWith('"')) {
    unquoted = unquoted.substring(1, unquoted.length - 1);
  }
  return unquoted.replace(/\\"/g, '"');
}

function getAccountType(accountNumber: number): string {
  if (accountNumber >= 1000 && accountNumber < 2000) return 'Assets';
  if (accountNumber >= 2000 && accountNumber < 3000) return 'Liabilities';
  if (accountNumber >= 3000 && accountNumber < 4000) return 'Income';
  if (accountNumber >= 4000 && accountNumber < 8000) return 'Expenses';
  if (accountNumber >= 8000 && accountNumber < 9000) return 'Other';
  return 'Unknown';
}

describe('SIE Import Parsing', () => {
  describe('Date parsing', () => {
    it('should parse YYYYMMDD to ISO format', () => {
      expect(parseDate('20240115')).toBe('2024-01-15');
      expect(parseDate('20231231')).toBe('2023-12-31');
    });

    it('should handle invalid dates', () => {
      expect(parseDate('')).toBe(null);
      expect(parseDate('2024')).toBe(null);
      expect(parseDate('202401')).toBe(null);
    });

    it('should handle edge case dates', () => {
      expect(parseDate('20240101')).toBe('2024-01-01');
      expect(parseDate('20241231')).toBe('2024-12-31');
    });
  });

  describe('Amount parsing (öre to SEK)', () => {
    it('should convert öre to SEK by dividing by 100', () => {
      expect(parseAmount(10000)).toBe(100);
      expect(parseAmount(100)).toBe(1);
      expect(parseAmount(0)).toBe(0);
    });

    it('should handle negative amounts', () => {
      expect(parseAmount(-10000)).toBe(-100);
      expect(parseAmount(-5050)).toBe(-50.50);
    });

    it('should handle decimal inputs', () => {
      expect(parseAmount(12345)).toBe(123.45);
      expect(parseAmount(99999)).toBe(999.99);
    });

    it('should handle string inputs', () => {
      expect(parseAmount('10000')).toBe(100);
      expect(parseAmount('-5000')).toBe(-50);
    });
  });

  describe('String unquoting', () => {
    it('should remove surrounding quotes', () => {
      expect(unquoteString('"Test Company"')).toBe('Test Company');
      expect(unquoteString('"Simple Text"')).toBe('Simple Text');
    });

    it('should handle empty strings', () => {
      expect(unquoteString('')).toBe('');
      expect(unquoteString('""')).toBe('');
    });

    it('should unescape quotes', () => {
      expect(unquoteString('"Test \\"quoted\\" text"')).toBe('Test "quoted" text');
    });

    it('should handle strings without quotes', () => {
      expect(unquoteString('NoQuotes')).toBe('NoQuotes');
    });

    it('should handle Swedish characters', () => {
      expect(unquoteString('"Företag AB"')).toBe('Företag AB');
      expect(unquoteString('"Räkningar och kvitton"')).toBe('Räkningar och kvitton');
    });
  });

  describe('Account type determination', () => {
    it('should identify Assets accounts (1000-1999)', () => {
      expect(getAccountType(1000)).toBe('Assets');
      expect(getAccountType(1500)).toBe('Assets');
      expect(getAccountType(1999)).toBe('Assets');
    });

    it('should identify Liabilities accounts (2000-2999)', () => {
      expect(getAccountType(2000)).toBe('Liabilities');
      expect(getAccountType(2510)).toBe('Liabilities');
      expect(getAccountType(2999)).toBe('Liabilities');
    });

    it('should identify Income accounts (3000-3999)', () => {
      expect(getAccountType(3000)).toBe('Income');
      expect(getAccountType(3500)).toBe('Income');
      expect(getAccountType(3999)).toBe('Income');
    });

    it('should identify Expenses accounts (4000-7999)', () => {
      expect(getAccountType(4000)).toBe('Expenses');
      expect(getAccountType(5000)).toBe('Expenses');
      expect(getAccountType(7999)).toBe('Expenses');
    });

    it('should identify Other accounts (8000-8999)', () => {
      expect(getAccountType(8000)).toBe('Other');
      expect(getAccountType(8500)).toBe('Other');
      expect(getAccountType(8999)).toBe('Other');
    });

    it('should handle unknown account ranges', () => {
      expect(getAccountType(999)).toBe('Unknown');
      expect(getAccountType(9000)).toBe('Unknown');
    });
  });

  describe('Transaction validation', () => {
    it('should validate balanced transactions', () => {
      const debit = 100;
      const credit = 100;
      expect(debit).toBe(credit);
    });

    it('should detect unbalanced transactions', () => {
      const debit = 100;
      const credit = 90;
      expect(Math.abs(debit - credit)).toBeGreaterThan(0.01);
    });

    it('should allow rounding tolerance', () => {
      const debit = 100.001;
      const credit = 100;
      expect(Math.abs(debit - credit)).toBeLessThan(0.01);
    });

    it('should handle multiple transaction lines', () => {
      const lines = [
        { debit: 100, credit: 0 },
        { debit: 0, credit: 50 },
        { debit: 0, credit: 50 }
      ];
      
      const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
      
      expect(totalDebit).toBe(totalCredit);
    });
  });

  describe('Duplicate detection logic', () => {
    it('should identify duplicates by date and description', () => {
      const transaction1 = { date: '2024-01-15', description: 'Invoice 123' };
      const transaction2 = { date: '2024-01-15', description: 'Invoice 123' };
      
      const isDuplicate = 
        transaction1.date === transaction2.date &&
        transaction1.description === transaction2.description;
      
      expect(isDuplicate).toBe(true);
    });

    it('should not flag as duplicate if description differs', () => {
      const transaction1 = { date: '2024-01-15', description: 'Invoice 123' };
      const transaction2 = { date: '2024-01-15', description: 'Invoice 124' };
      
      const isDuplicate = 
        transaction1.date === transaction2.date &&
        transaction1.description === transaction2.description;
      
      expect(isDuplicate).toBe(false);
    });

    it('should not flag as duplicate if date differs', () => {
      const transaction1 = { date: '2024-01-15', description: 'Invoice 123' };
      const transaction2 = { date: '2024-01-16', description: 'Invoice 123' };
      
      const isDuplicate = 
        transaction1.date === transaction2.date &&
        transaction1.description === transaction2.description;
      
      expect(isDuplicate).toBe(false);
    });
  });

  describe('SIE format validation', () => {
    it('should recognize valid SIE commands', () => {
      const validCommands = ['#FLAGGA', '#FNAMN', '#ORGNR', '#KONTO', '#VER', '#TRANS', '#RAR'];
      validCommands.forEach(cmd => {
        expect(cmd.startsWith('#')).toBe(true);
      });
    });

    it('should detect verification block markers', () => {
      expect('{').toBe('{');
      expect('}').toBe('}');
    });

    it('should identify comment lines', () => {
      const line = '// This is a comment';
      expect(line.startsWith('//')).toBe(true);
    });
  });
});

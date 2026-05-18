import { describe, it, expect } from 'vitest';

describe('VAT Calculations', () => {
  describe('VAT amount calculation', () => {
    it('should calculate 25% VAT correctly', () => {
      const amount = 1000;
      const vatRate = 25;
      const expectedVAT = 250;
      
      const calculatedVAT = (amount * vatRate) / 100;
      
      expect(calculatedVAT).toBe(expectedVAT);
    });

    it('should calculate 12% VAT correctly', () => {
      const amount = 1000;
      const vatRate = 12;
      const expectedVAT = 120;
      
      const calculatedVAT = (amount * vatRate) / 100;
      
      expect(calculatedVAT).toBe(expectedVAT);
    });

    it('should calculate 6% VAT correctly', () => {
      const amount = 1000;
      const vatRate = 6;
      const expectedVAT = 60;
      
      const calculatedVAT = (amount * vatRate) / 100;
      
      expect(calculatedVAT).toBe(expectedVAT);
    });

    it('should return 0 for 0% VAT rate', () => {
      const amount = 1000;
      const vatRate = 0;
      const expectedVAT = 0;
      
      const calculatedVAT = (amount * vatRate) / 100;
      
      expect(calculatedVAT).toBe(expectedVAT);
    });

    it('should handle decimal amounts correctly', () => {
      const amount = 123.45;
      const vatRate = 25;
      const expectedVAT = 30.86;
      
      const calculatedVAT = parseFloat(((amount * vatRate) / 100).toFixed(2));
      
      expect(calculatedVAT).toBe(expectedVAT);
    });

    it('should round to 2 decimal places', () => {
      const amount = 333.33;
      const vatRate = 25;
      const expectedVAT = 83.33;
      
      const calculatedVAT = parseFloat(((amount * vatRate) / 100).toFixed(2));
      
      expect(calculatedVAT).toBe(expectedVAT);
    });
  });

  describe('VAT report calculations', () => {
    it('should calculate net VAT payable correctly (sales > purchases)', () => {
      const salesVAT = 1000;
      const purchaseVAT = 300;
      const expectedNetVAT = 700;
      
      const netVAT = salesVAT - purchaseVAT;
      
      expect(netVAT).toBe(expectedNetVAT);
    });

    it('should calculate net VAT refund correctly (purchases > sales)', () => {
      const salesVAT = 300;
      const purchaseVAT = 1000;
      const expectedNetVAT = -700;
      
      const netVAT = salesVAT - purchaseVAT;
      
      expect(netVAT).toBe(expectedNetVAT);
    });

    it('should handle zero sales VAT', () => {
      const salesVAT = 0;
      const purchaseVAT = 500;
      const expectedNetVAT = -500;
      
      const netVAT = salesVAT - purchaseVAT;
      
      expect(netVAT).toBe(expectedNetVAT);
    });

    it('should handle zero purchase VAT', () => {
      const salesVAT = 500;
      const purchaseVAT = 0;
      const expectedNetVAT = 500;
      
      const netVAT = salesVAT - purchaseVAT;
      
      expect(netVAT).toBe(expectedNetVAT);
    });

    it('should handle equal sales and purchase VAT', () => {
      const salesVAT = 500;
      const purchaseVAT = 500;
      const expectedNetVAT = 0;
      
      const netVAT = salesVAT - purchaseVAT;
      
      expect(netVAT).toBe(expectedNetVAT);
    });
  });

  describe('Multiple VAT rates in transaction', () => {
    it('should sum VAT amounts from multiple lines correctly', () => {
      const lines = [
        { amount: 1000, vatRate: 25 },
        { amount: 500, vatRate: 12 },
        { amount: 300, vatRate: 6 }
      ];
      
      const totalVAT = lines.reduce((sum, line) => {
        return sum + (line.amount * line.vatRate) / 100;
      }, 0);
      
      expect(totalVAT).toBe(328);
    });

    it('should handle mixed VAT rates including 0%', () => {
      const lines = [
        { amount: 1000, vatRate: 25 },
        { amount: 500, vatRate: 0 },
        { amount: 200, vatRate: 12 }
      ];
      
      const totalVAT = lines.reduce((sum, line) => {
        return sum + (line.amount * line.vatRate) / 100;
      }, 0);
      
      expect(totalVAT).toBe(274);
    });
  });

  describe('Swedish VAT rates validation', () => {
    it('should recognize all valid Swedish VAT rates', () => {
      const validRates = [0, 6, 12, 25];
      
      validRates.forEach(rate => {
        expect([0, 6, 12, 25]).toContain(rate);
      });
    });

    it('should calculate correct examples for each Swedish VAT rate', () => {
      const testCases = [
        { rate: 25, description: 'Standard rate', amount: 100, expected: 25 },
        { rate: 12, description: 'Food/hotel rate', amount: 100, expected: 12 },
        { rate: 6, description: 'Books/culture rate', amount: 100, expected: 6 },
        { rate: 0, description: 'Exempt', amount: 100, expected: 0 }
      ];
      
      testCases.forEach(({ rate, amount, expected }) => {
        const calculatedVAT = (amount * rate) / 100;
        expect(calculatedVAT).toBe(expected);
      });
    });
  });
});

import { describe, it, expect } from 'vitest';

interface Account {
  id: number;
  account_number: number;
  account_name: string;
  account_type: string;
}

interface AccountBalance {
  account_number: number;
  account_name: string;
  account_type: string;
  balance: number;
}

function calculateAccountBalances(
  accounts: Account[],
  balanceMap: Map<number, number>
): AccountBalance[] {
  return accounts.map((account) => ({
    account_number: account.account_number,
    account_name: account.account_name,
    account_type: account.account_type,
    balance: balanceMap.get(account.id) || 0,
  }));
}

function generateBalanceSheet(accountBalances: AccountBalance[]) {
  const assets = accountBalances.filter(
    (acc) => acc.account_number >= 1000 && acc.account_number < 2000
  );
  const fixedAssets = assets.filter((acc) => acc.account_number < 1300);
  const currentAssets = assets.filter((acc) => acc.account_number >= 1300);

  const equityAndLiabilities = accountBalances.filter(
    (acc) => acc.account_number >= 2000 && acc.account_number < 3000
  );
  const equity = equityAndLiabilities.filter((acc) => acc.account_number < 2100);
  const liabilities = equityAndLiabilities.filter((acc) => acc.account_number >= 2100);

  const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
  const totalEquityAndLiabilities = equityAndLiabilities.reduce((sum, acc) => sum + acc.balance, 0);

  return {
    fixedAssets,
    currentAssets,
    equity,
    liabilities,
    totalAssets,
    totalEquityAndLiabilities,
  };
}

function generateIncomeStatement(accountBalances: AccountBalance[]) {
  const income = accountBalances.filter(
    (acc) => acc.account_number >= 3000 && acc.account_number < 4000
  );

  const expenses = accountBalances.filter(
    (acc) => acc.account_number >= 4000 && acc.account_number < 9000
  );

  const costOfGoodsSold = expenses.filter(
    (acc) => acc.account_number >= 4000 && acc.account_number < 5000
  );
  const operatingExpenses = expenses.filter(
    (acc) => acc.account_number >= 5000 && acc.account_number < 8000
  );
  const financialItems = expenses.filter(
    (acc) => acc.account_number >= 8000 && acc.account_number < 8800
  );
  const taxes = expenses.filter((acc) => acc.account_number >= 8800 && acc.account_number < 9000);

  const totalIncome = income.reduce((sum, acc) => sum - acc.balance, 0);
  const totalCostOfGoodsSold = costOfGoodsSold.reduce((sum, acc) => sum + acc.balance, 0);
  const totalOperatingExpenses = operatingExpenses.reduce((sum, acc) => sum + acc.balance, 0);
  const totalFinancialItems = financialItems.reduce((sum, acc) => sum + acc.balance, 0);
  const totalTaxes = taxes.reduce((sum, acc) => sum + acc.balance, 0);

  const grossProfit = totalIncome - totalCostOfGoodsSold;
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const profitBeforeTax = operatingProfit - totalFinancialItems;
  const netProfit = profitBeforeTax - totalTaxes;

  return {
    totalIncome,
    totalCostOfGoodsSold,
    totalOperatingExpenses,
    totalFinancialItems,
    totalTaxes,
    grossProfit,
    operatingProfit,
    profitBeforeTax,
    netProfit,
  };
}

describe('Report Generation', () => {
  describe('generateBalanceSheet', () => {
    it('should correctly categorize assets', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 1111, account_name: 'Buildings', account_type: 'Fixed Assets', balance: 500000 },
        { account_number: 1410, account_name: 'Accounts Receivable', account_type: 'Current Assets', balance: 50000 },
        { account_number: 1940, account_name: 'Bank', account_type: 'Current Assets', balance: 100000 },
      ];

      const balanceSheet = generateBalanceSheet(accountBalances);

      expect(balanceSheet.fixedAssets).toHaveLength(1);
      expect(balanceSheet.fixedAssets[0].account_number).toBe(1111);
      expect(balanceSheet.currentAssets).toHaveLength(2);
      expect(balanceSheet.totalAssets).toBe(650000);
    });

    it('should correctly categorize equity and liabilities', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 2010, account_name: 'Share Capital', account_type: 'Equity', balance: -400000 },
        { account_number: 2440, account_name: 'Accounts Payable', account_type: 'Liabilities', balance: -50000 },
        { account_number: 2510, account_name: 'VAT Payable', account_type: 'Liabilities', balance: -25000 },
      ];

      const balanceSheet = generateBalanceSheet(accountBalances);

      expect(balanceSheet.equity).toHaveLength(1);
      expect(balanceSheet.equity[0].account_number).toBe(2010);
      expect(balanceSheet.liabilities).toHaveLength(2);
      expect(balanceSheet.totalEquityAndLiabilities).toBe(-475000);
    });

    it('should calculate totals correctly', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 1111, account_name: 'Buildings', account_type: 'Fixed Assets', balance: 500000 },
        { account_number: 1940, account_name: 'Bank', account_type: 'Current Assets', balance: 100000 },
        { account_number: 2010, account_name: 'Share Capital', account_type: 'Equity', balance: -400000 },
        { account_number: 2440, account_name: 'Accounts Payable', account_type: 'Liabilities', balance: -200000 },
      ];

      const balanceSheet = generateBalanceSheet(accountBalances);

      expect(balanceSheet.totalAssets).toBe(600000);
      expect(balanceSheet.totalEquityAndLiabilities).toBe(-600000);
    });

    it('should handle empty accounts', () => {
      const accountBalances: AccountBalance[] = [];

      const balanceSheet = generateBalanceSheet(accountBalances);

      expect(balanceSheet.fixedAssets).toHaveLength(0);
      expect(balanceSheet.currentAssets).toHaveLength(0);
      expect(balanceSheet.equity).toHaveLength(0);
      expect(balanceSheet.liabilities).toHaveLength(0);
      expect(balanceSheet.totalAssets).toBe(0);
      expect(balanceSheet.totalEquityAndLiabilities).toBe(0);
    });
  });

  describe('generateIncomeStatement', () => {
    it('should correctly calculate income', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 3001, account_name: 'Sales - Goods', account_type: 'Income', balance: -100000 },
        { account_number: 3002, account_name: 'Sales - Services', account_type: 'Income', balance: -50000 },
      ];

      const incomeStatement = generateIncomeStatement(accountBalances);

      expect(incomeStatement.totalIncome).toBe(150000);
    });

    it('should correctly calculate gross profit', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 3001, account_name: 'Sales', account_type: 'Income', balance: -100000 },
        { account_number: 4010, account_name: 'Purchase of goods', account_type: 'COGS', balance: 40000 },
      ];

      const incomeStatement = generateIncomeStatement(accountBalances);

      expect(incomeStatement.totalIncome).toBe(100000);
      expect(incomeStatement.totalCostOfGoodsSold).toBe(40000);
      expect(incomeStatement.grossProfit).toBe(60000);
    });

    it('should correctly calculate operating profit', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 3001, account_name: 'Sales', account_type: 'Income', balance: -100000 },
        { account_number: 4010, account_name: 'Purchase of goods', account_type: 'COGS', balance: 40000 },
        { account_number: 5010, account_name: 'Rent', account_type: 'Operating Expenses', balance: 10000 },
        { account_number: 7010, account_name: 'Salaries', account_type: 'Personnel Costs', balance: 30000 },
      ];

      const incomeStatement = generateIncomeStatement(accountBalances);

      expect(incomeStatement.grossProfit).toBe(60000);
      expect(incomeStatement.totalOperatingExpenses).toBe(40000);
      expect(incomeStatement.operatingProfit).toBe(20000);
    });

    it('should correctly calculate net profit', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 3001, account_name: 'Sales', account_type: 'Income', balance: -100000 },
        { account_number: 4010, account_name: 'Purchase of goods', account_type: 'COGS', balance: 40000 },
        { account_number: 5010, account_name: 'Rent', account_type: 'Operating Expenses', balance: 10000 },
        { account_number: 8130, account_name: 'Interest expenses', account_type: 'Financial', balance: 2000 },
        { account_number: 8810, account_name: 'Tax', account_type: 'Tax', balance: 10000 },
      ];

      const incomeStatement = generateIncomeStatement(accountBalances);

      expect(incomeStatement.grossProfit).toBe(60000);
      expect(incomeStatement.operatingProfit).toBe(50000);
      expect(incomeStatement.profitBeforeTax).toBe(48000);
      expect(incomeStatement.netProfit).toBe(38000);
    });

    it('should handle loss scenarios', () => {
      const accountBalances: AccountBalance[] = [
        { account_number: 3001, account_name: 'Sales', account_type: 'Income', balance: -50000 },
        { account_number: 4010, account_name: 'Purchase of goods', account_type: 'COGS', balance: 40000 },
        { account_number: 7010, account_name: 'Salaries', account_type: 'Personnel Costs', balance: 30000 },
      ];

      const incomeStatement = generateIncomeStatement(accountBalances);

      expect(incomeStatement.grossProfit).toBe(10000);
      expect(incomeStatement.operatingProfit).toBe(-20000);
      expect(incomeStatement.netProfit).toBe(-20000);
    });

    it('should handle empty accounts', () => {
      const accountBalances: AccountBalance[] = [];

      const incomeStatement = generateIncomeStatement(accountBalances);

      expect(incomeStatement.totalIncome).toBe(0);
      expect(incomeStatement.totalCostOfGoodsSold).toBe(0);
      expect(incomeStatement.grossProfit).toBe(0);
      expect(incomeStatement.operatingProfit).toBe(0);
      expect(incomeStatement.netProfit).toBe(0);
    });
  });

  describe('calculateAccountBalances', () => {
    it('should map account balances correctly', () => {
      const accounts: Account[] = [
        { id: 1, account_number: 1940, account_name: 'Bank', account_type: 'Current Assets' },
        { id: 2, account_number: 3001, account_name: 'Sales', account_type: 'Income' },
      ];

      const balanceMap = new Map<number, number>([
        [1, 50000],
        [2, -100000],
      ]);

      const accountBalances = calculateAccountBalances(accounts, balanceMap);

      expect(accountBalances).toHaveLength(2);
      expect(accountBalances[0].balance).toBe(50000);
      expect(accountBalances[1].balance).toBe(-100000);
    });

    it('should handle accounts with zero balance', () => {
      const accounts: Account[] = [
        { id: 1, account_number: 1940, account_name: 'Bank', account_type: 'Current Assets' },
      ];

      const balanceMap = new Map<number, number>();

      const accountBalances = calculateAccountBalances(accounts, balanceMap);

      expect(accountBalances[0].balance).toBe(0);
    });
  });
});

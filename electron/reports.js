/**
 * Financial Reports Generation Module
 * Generates Profit & Loss, Balance Sheet, and Cash Flow statements
 * Based on Swedish BAS 2024 account structure
 */

/**
 * Generate Profit & Loss Statement (Resultaträkning)
 * 
 * @param {Object} db - Database instance
 * @param {number} companyId - Company ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Profit & Loss data
 */
function generateProfitAndLoss(db, companyId, startDate, endDate) {
  // Get all accounts for the company
  const accountsResult = db.exec(
    'SELECT * FROM accounts WHERE company_id = ? ORDER BY account_number',
    [companyId]
  );
  
  if (accountsResult.length === 0) {
    return { revenue: [], expenses: [], summary: {} };
  }
  
  const accounts = [];
  const cols = accountsResult[0].columns;
  accountsResult[0].values.forEach(row => {
    const acc = {};
    cols.forEach((col, idx) => {
      acc[col] = row[idx];
    });
    accounts.push(acc);
  });
  
  // Calculate balance for each account
  const accountBalances = {};
  
  for (const account of accounts) {
    const linesResult = db.exec(
      `SELECT SUM(tl.debit) as total_debit, SUM(tl.credit) as total_credit
       FROM transaction_lines tl
       JOIN transactions t ON tl.transaction_id = t.id
       WHERE tl.account_id = ? 
         AND t.company_id = ?
         AND t.transaction_date >= ? 
         AND t.transaction_date <= ?`,
      [account.id, companyId, startDate, endDate]
    );
    
    let debit = 0;
    let credit = 0;
    
    if (linesResult.length > 0 && linesResult[0].values.length > 0) {
      debit = linesResult[0].values[0][0] || 0;
      credit = linesResult[0].values[0][1] || 0;
    }
    
    // For income/expense accounts, the balance is credit - debit
    // Income (3000-3999): credit increases income
    // Expenses (4000-7999): debit increases expenses
    accountBalances[account.id] = {
      account_number: account.account_number,
      account_name: account.account_name,
      debit,
      credit,
      balance: credit - debit
    };
  }
  
  // Categorize accounts
  const revenue = []; // 3000-3999
  const costOfSales = []; // 4000-4999
  const operatingExpenses = []; // 5000-7999
  const financialItems = []; // 8000-8999
  
  for (const account of accounts) {
    const balance = accountBalances[account.id];
    const accNum = account.account_number;
    
    // Skip accounts with zero balance
    if (balance.debit === 0 && balance.credit === 0) continue;
    
    if (accNum >= 3000 && accNum < 4000) {
      revenue.push(balance);
    } else if (accNum >= 4000 && accNum < 5000) {
      costOfSales.push(balance);
    } else if (accNum >= 5000 && accNum < 8000) {
      operatingExpenses.push(balance);
    } else if (accNum >= 8000 && accNum < 9000) {
      financialItems.push(balance);
    }
  }
  
  // Calculate totals
  const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
  const totalCostOfSales = costOfSales.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  const grossProfit = totalRevenue - totalCostOfSales;
  
  const totalOperatingExpenses = operatingExpenses.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  const operatingProfit = grossProfit - totalOperatingExpenses;
  
  // Financial items can be positive (income) or negative (expenses)
  const totalFinancialIncome = financialItems
    .filter(acc => acc.balance > 0)
    .reduce((sum, acc) => sum + acc.balance, 0);
  const totalFinancialExpenses = financialItems
    .filter(acc => acc.balance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  
  const netProfit = operatingProfit + totalFinancialIncome - totalFinancialExpenses;
  
  return {
    revenue,
    costOfSales,
    operatingExpenses,
    financialIncome: financialItems.filter(acc => acc.balance > 0),
    financialExpenses: financialItems.filter(acc => acc.balance < 0),
    summary: {
      totalRevenue,
      totalCostOfSales,
      grossProfit,
      totalOperatingExpenses,
      operatingProfit,
      totalFinancialIncome,
      totalFinancialExpenses,
      netProfit
    }
  };
}

/**
 * Generate Balance Sheet (Balansräkning)
 * 
 * @param {Object} db - Database instance
 * @param {number} companyId - Company ID
 * @param {string} asOfDate - Date for balance sheet (YYYY-MM-DD)
 * @returns {Object} Balance Sheet data
 */
function generateBalanceSheet(db, companyId, asOfDate) {
  // Get all accounts for the company
  const accountsResult = db.exec(
    'SELECT * FROM accounts WHERE company_id = ? ORDER BY account_number',
    [companyId]
  );
  
  if (accountsResult.length === 0) {
    return { assets: [], liabilities: [], equity: [], summary: {} };
  }
  
  const accounts = [];
  const cols = accountsResult[0].columns;
  accountsResult[0].values.forEach(row => {
    const acc = {};
    cols.forEach((col, idx) => {
      acc[col] = row[idx];
    });
    accounts.push(acc);
  });
  
  // Calculate balance for each account up to the specified date
  const accountBalances = {};
  
  for (const account of accounts) {
    const linesResult = db.exec(
      `SELECT SUM(tl.debit) as total_debit, SUM(tl.credit) as total_credit
       FROM transaction_lines tl
       JOIN transactions t ON tl.transaction_id = t.id
       WHERE tl.account_id = ? 
         AND t.company_id = ?
         AND t.transaction_date <= ?`,
      [account.id, companyId, asOfDate]
    );
    
    let debit = 0;
    let credit = 0;
    
    if (linesResult.length > 0 && linesResult[0].values.length > 0) {
      debit = linesResult[0].values[0][0] || 0;
      credit = linesResult[0].values[0][1] || 0;
    }
    
    // For balance sheet accounts:
    // Assets (1000-1999): debit increases, credit decreases
    // Liabilities (2000-2999): credit increases, debit decreases
    const accNum = account.account_number;
    let balance;
    
    if (accNum >= 1000 && accNum < 2000) {
      // Assets: debit balance
      balance = debit - credit;
    } else {
      // Liabilities & Equity: credit balance
      balance = credit - debit;
    }
    
    accountBalances[account.id] = {
      account_number: account.account_number,
      account_name: account.account_name,
      debit,
      credit,
      balance
    };
  }
  
  // Categorize accounts
  const assets = []; // 1000-1999
  const liabilities = []; // 2000-2999 (excluding equity ranges)
  const equity = []; // 2000-2099 typically
  
  for (const account of accounts) {
    const balance = accountBalances[account.id];
    const accNum = account.account_number;
    
    // Skip accounts with zero balance
    if (Math.abs(balance.balance) < 0.01) continue;
    
    if (accNum >= 1000 && accNum < 2000) {
      assets.push(balance);
    } else if (accNum >= 2000 && accNum < 2100) {
      // Equity accounts (2000-2099)
      equity.push(balance);
    } else if (accNum >= 2100 && accNum < 3000) {
      // Liabilities (2100-2999)
      liabilities.push(balance);
    }
  }
  
  // Calculate totals
  const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
  const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
  
  // Add retained earnings (calculated from P&L)
  // For now, we'll show it as a separate line item
  const retainedEarnings = totalAssets - totalLiabilities - totalEquity;
  
  return {
    assets,
    liabilities,
    equity,
    summary: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      retainedEarnings,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity + retainedEarnings
    }
  };
}

/**
 * Generate Cash Flow Statement (Kassaflödesanalys)
 * 
 * @param {Object} db - Database instance
 * @param {number} companyId - Company ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Cash Flow data
 */
function generateCashFlow(db, companyId, startDate, endDate) {
  // Get all accounts for the company
  const accountsResult = db.exec(
    'SELECT * FROM accounts WHERE company_id = ? ORDER BY account_number',
    [companyId]
  );
  
  if (accountsResult.length === 0) {
    return { operating: [], investing: [], financing: [], summary: {} };
  }
  
  const accounts = [];
  const cols = accountsResult[0].columns;
  accountsResult[0].values.forEach(row => {
    const acc = {};
    cols.forEach((col, idx) => {
      acc[col] = row[idx];
    });
    accounts.push(acc);
  });
  
  // Calculate changes for each account during the period
  const accountChanges = {};
  
  for (const account of accounts) {
    const linesResult = db.exec(
      `SELECT SUM(tl.debit) as total_debit, SUM(tl.credit) as total_credit
       FROM transaction_lines tl
       JOIN transactions t ON tl.transaction_id = t.id
       WHERE tl.account_id = ? 
         AND t.company_id = ?
         AND t.transaction_date >= ? 
         AND t.transaction_date <= ?`,
      [account.id, companyId, startDate, endDate]
    );
    
    let debit = 0;
    let credit = 0;
    
    if (linesResult.length > 0 && linesResult[0].values.length > 0) {
      debit = linesResult[0].values[0][0] || 0;
      credit = linesResult[0].values[0][1] || 0;
    }
    
    accountChanges[account.id] = {
      account_number: account.account_number,
      account_name: account.account_name,
      debit,
      credit,
      netChange: debit - credit
    };
  }
  
  // Categorize by cash flow type
  const operating = []; // Operating activities
  const investing = []; // Investing activities (1100-1299 fixed assets)
  const financing = []; // Financing activities (2000-2999 liabilities & equity)
  
  // Get net profit from P&L
  const pl = generateProfitAndLoss(db, companyId, startDate, endDate);
  const netProfit = pl.summary.netProfit;
  
  // Start with net profit for operating activities
  operating.push({
    account_number: null,
    account_name: 'Periodens resultat (Net Profit)',
    netChange: netProfit
  });
  
  for (const account of accounts) {
    const change = accountChanges[account.id];
    const accNum = account.account_number;
    
    // Skip if no activity
    if (change.debit === 0 && change.credit === 0) continue;
    
    // Cash accounts (1900-1999) - these are the changes we're tracking
    if (accNum >= 1900 && accNum < 2000) {
      // Skip - this is our result
      continue;
    }
    // Fixed assets (1100-1299) - Investing
    else if (accNum >= 1100 && accNum < 1300) {
      investing.push(change);
    }
    // Liabilities and Equity (2000-2999) - Financing
    else if (accNum >= 2000 && accNum < 3000) {
      financing.push(change);
    }
    // Current assets and working capital changes (1300-1899) - Operating
    else if (accNum >= 1300 && accNum < 1900) {
      operating.push(change);
    }
  }
  
  // Calculate totals
  const cashFromOperating = operating.reduce((sum, item) => sum + (item.netChange || 0), 0);
  const cashFromInvesting = investing.reduce((sum, item) => sum + (item.netChange || 0), 0);
  const cashFromFinancing = financing.reduce((sum, item) => sum + (item.netChange || 0), 0);
  
  const netCashFlow = cashFromOperating + cashFromInvesting + cashFromFinancing;
  
  return {
    operating,
    investing,
    financing,
    summary: {
      cashFromOperating,
      cashFromInvesting,
      cashFromFinancing,
      netCashFlow
    }
  };
}

module.exports = {
  generateProfitAndLoss,
  generateBalanceSheet,
  generateCashFlow
};

/**
 * SIE (Standard Import Export) Type 4 File Generator
 * Generates SIE format files compliant with Swedish accounting standards
 */

/**
 * Format date as YYYYMMDD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format amount in öre (multiply by 100, round to integer)
 */
function formatAmount(amount) {
  return Math.round(amount * 100);
}

/**
 * Escape and quote string for SIE format
 */
function quoteString(str) {
  if (!str) return '""';
  // Escape quotes in the string
  const escaped = String(str).replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Generate SIE Type 4 file content
 * 
 * @param {Object} data - Export data
 * @param {Object} data.company - Company information
 * @param {Array} data.accounts - Chart of accounts
 * @param {Array} data.transactions - Transaction list with lines
 * @param {string} data.startDate - Period start date
 * @param {string} data.endDate - Period end date
 * @returns {string} SIE file content
 */
function generateSIE(data) {
  const { company, accounts, transactions, startDate, endDate } = data;
  
  const lines = [];
  
  // Header section
  lines.push('#FLAGGA 0');
  lines.push(`#PROGRAM ${quoteString('Accounting App')} 1.0`);
  lines.push('#FORMAT PC8');
  lines.push(`#GEN ${formatDate(new Date())}`);
  lines.push('#SIETYP 4');
  lines.push(`#PROSA ${quoteString('Export from Accounting App')}`);
  lines.push(`#FNAMN ${quoteString(company.name)}`);
  
  // Organization number (if available)
  if (company.org_number) {
    lines.push(`#ORGNR ${quoteString(company.org_number)}`);
  }
  
  // Account plan type
  lines.push('#KPTYP BAS2024');
  
  // Fiscal year (RAR 0 means current year)
  lines.push(`#RAR 0 ${formatDate(startDate)} ${formatDate(endDate)}`);
  
  // Empty line for readability
  lines.push('');
  
  // Chart of accounts
  lines.push('// Chart of Accounts');
  for (const account of accounts) {
    lines.push(`#KONTO ${account.account_number} ${quoteString(account.account_name)}`);
  }
  
  // Empty line for readability
  lines.push('');
  
  // Transactions (verifications)
  lines.push('// Transactions');
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    const verNumber = i + 1;
    const transDate = formatDate(transaction.transaction_date);
    const description = quoteString(transaction.description || 'Transaction');
    
    // Start verification with series A
    lines.push(`#VER A ${verNumber} ${transDate} ${description}`);
    lines.push('{');
    
    // Transaction lines
    for (const line of transaction.lines) {
      const account = line.account_number;
      const amount = formatAmount(line.debit > 0 ? line.debit : -line.credit);
      
      // TRANS format: #TRANS account_number {} amount
      // {} represents object list (empty in our case)
      lines.push(`  #TRANS ${account} {} ${amount}`);
    }
    
    lines.push('}');
    lines.push('');
  }
  
  return lines.join('\r\n');
}

module.exports = {
  generateSIE,
  formatDate,
  formatAmount,
  quoteString
};

/**
 * SIE (Standard Import Export) File Parser
 * Parses SIE Type 4 and Type 5 format files compliant with Swedish accounting standards
 * 
 * SIE 4: Periodic transactions export (most common)
 * SIE 5: Annual accounts with opening and closing balances
 */

/**
 * Parse date from YYYYMMDD format to ISO string
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Parse amount from öre to SEK (divide by 100)
 */
function parseAmount(amount) {
  return parseFloat(amount) / 100;
}

/**
 * Unquote and unescape string from SIE format
 */
function unquoteString(str) {
  if (!str) return '';
  // Remove surrounding quotes
  let unquoted = str.trim();
  if (unquoted.startsWith('"') && unquoted.endsWith('"')) {
    unquoted = unquoted.substring(1, unquoted.length - 1);
  }
  // Unescape quotes
  return unquoted.replace(/\\"/g, '"');
}

/**
 * Split line into tokens, respecting quoted strings
 */
function tokenizeLine(line) {
  const tokens = [];
  let current = '';
  let inQuotes = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse SIE file content (supports both Type 4 and Type 5)
 * 
 * @param {string} content - SIE file content
 * @returns {Object} Parsed data with company, accounts, transactions, and balances
 */
function parseSIE(content) {
  const lines = content.split(/\r?\n/);
  const result = {
    sieType: null,
    company: {
      name: '',
      org_number: ''
    },
    accounts: [],
    transactions: [],
    fiscalYear: {
      start: '',
      end: ''
    },
    openingBalances: [],  // SIE 5: #IB (Ingående balans)
    closingBalances: []   // SIE 5: #UB (Utgående balans)
  };

  let currentTransaction = null;
  let inVerification = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('//')) continue;

    const tokens = tokenizeLine(line);
    if (tokens.length === 0) continue;

    const command = tokens[0];

    // Parse SIE type
    if (command === '#SIETYP' && tokens.length > 1) {
      result.sieType = parseInt(tokens[1]);
    }

    // Parse company name
    if (command === '#FNAMN' && tokens.length > 1) {
      result.company.name = unquoteString(tokens.slice(1).join(' '));
    }

    // Parse organization number
    if (command === '#ORGNR' && tokens.length > 1) {
      result.company.org_number = unquoteString(tokens[1]);
    }

    // Parse fiscal year
    if (command === '#RAR' && tokens.length >= 4) {
      result.fiscalYear.start = parseDate(tokens[2]);
      result.fiscalYear.end = parseDate(tokens[3]);
    }

    // Parse account
    if (command === '#KONTO' && tokens.length >= 3) {
      const accountNumber = parseInt(tokens[1]);
      const accountName = unquoteString(tokens.slice(2).join(' '));
      result.accounts.push({
        account_number: accountNumber,
        account_name: accountName,
        account_type: getAccountType(accountNumber)
      });
    }

    // Parse opening balance (SIE 5: #IB)
    // Format: #IB year account_number amount
    if (command === '#IB' && tokens.length >= 4) {
      const year = parseInt(tokens[1]);
      const accountNumber = parseInt(tokens[2]);
      const amount = parseAmount(tokens[3]);
      result.openingBalances.push({
        year,
        account_number: accountNumber,
        amount
      });
    }

    // Parse closing balance (SIE 5: #UB)
    // Format: #UB year account_number amount
    if (command === '#UB' && tokens.length >= 4) {
      const year = parseInt(tokens[1]);
      const accountNumber = parseInt(tokens[2]);
      const amount = parseAmount(tokens[3]);
      result.closingBalances.push({
        year,
        account_number: accountNumber,
        amount
      });
    }

    // Parse verification (transaction)
    if (command === '#VER') {
      // Format: #VER series number date description
      if (tokens.length >= 4) {
        const series = unquoteString(tokens[1]);
        const verNumber = parseInt(tokens[2]);
        const date = parseDate(tokens[3]);
        const description = tokens.length > 4 ? unquoteString(tokens.slice(4).join(' ')) : '';

        currentTransaction = {
          series,
          verNumber,
          transaction_date: date,
          description,
          lines: []
        };
      }
    }

    // Start of verification block
    if (line === '{') {
      inVerification = true;
    }

    // Parse transaction line
    if (command === '#TRANS' && inVerification && currentTransaction) {
      // Format: #TRANS account {} amount
      if (tokens.length >= 4) {
        const accountNumber = parseInt(tokens[1]);
        const amount = parseAmount(tokens[3]);

        const transLine = {
          account_number: accountNumber,
          debit: amount > 0 ? amount : 0,
          credit: amount < 0 ? Math.abs(amount) : 0
        };

        currentTransaction.lines.push(transLine);
      }
    }

    // End of verification block
    if (line === '}') {
      inVerification = false;
      if (currentTransaction) {
        // Validate transaction is balanced
        const totalDebit = currentTransaction.lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = currentTransaction.lines.reduce((sum, line) => sum + line.credit, 0);
        
        if (Math.abs(totalDebit - totalCredit) < 0.01) {
          result.transactions.push(currentTransaction);
        } else {
          console.warn(`Skipping unbalanced transaction: ${currentTransaction.description} (Debit: ${totalDebit}, Credit: ${totalCredit})`);
        }
        
        currentTransaction = null;
      }
    }
  }

  return result;
}

/**
 * Determine account type based on account number (BAS 2024)
 */
function getAccountType(accountNumber) {
  if (accountNumber >= 1000 && accountNumber < 2000) return 'Assets';
  if (accountNumber >= 2000 && accountNumber < 3000) return 'Liabilities';
  if (accountNumber >= 3000 && accountNumber < 4000) return 'Income';
  if (accountNumber >= 4000 && accountNumber < 8000) return 'Expenses';
  if (accountNumber >= 8000 && accountNumber < 9000) return 'Other';
  return 'Unknown';
}

/**
 * Validate parsed SIE data
 */
function validateSIE(data) {
  const errors = [];

  if (!data.company.name) {
    errors.push('Company name is missing');
  }

  if (data.accounts.length === 0) {
    errors.push('No accounts found in SIE file');
  }

  // For SIE 4, transactions are required
  // For SIE 5, either transactions or balances should be present
  if (data.sieType === 4 && data.transactions.length === 0) {
    errors.push('No transactions found in SIE Type 4 file');
  }

  if (data.sieType === 5 && data.transactions.length === 0 && 
      data.openingBalances.length === 0 && data.closingBalances.length === 0) {
    errors.push('No transactions or balances found in SIE Type 5 file');
  }

  // Check for duplicate account numbers
  const accountNumbers = new Set();
  for (const account of data.accounts) {
    if (accountNumbers.has(account.account_number)) {
      errors.push(`Duplicate account number: ${account.account_number}`);
    }
    accountNumbers.add(account.account_number);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  parseSIE,
  parseDate,
  parseAmount,
  unquoteString,
  validateSIE
};

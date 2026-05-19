/**
 * Excel Parser for Accounting Data
 * Reads Excel files and extracts transaction data
 */

const XLSX = require('xlsx');

/**
 * Read Excel file and return sheet data
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} Parsed Excel data with sheets and preview
 */
function parseExcelFile(fileBuffer) {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get all sheet names
    const sheetNames = workbook.SheetNames;
    
    if (sheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }
    
    // Parse the first sheet by default
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row as first row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    });
    
    if (jsonData.length === 0) {
      throw new Error('Excel sheet is empty');
    }
    
    // Extract headers (first row)
    const headers = jsonData[0];
    
    // Get data rows (skip header)
    const dataRows = jsonData.slice(1).filter(row => {
      // Filter out completely empty rows
      return row.some(cell => cell !== '' && cell != null);
    });
    
    // Get column count
    const columnCount = headers.length;
    
    // Create preview (first 10 rows)
    const previewRows = dataRows.slice(0, 10);
    
    return {
      success: true,
      sheetNames,
      selectedSheet: firstSheetName,
      headers,
      columnCount,
      totalRows: dataRows.length,
      previewRows,
      allRows: dataRows
    };
    
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert mapped Excel data to transactions
 * @param {Object} params - Mapping configuration
 * @returns {Object} Converted transactions
 */
function convertExcelToTransactions(params) {
  const {
    rows,
    mapping,
    companyId,
    groupingMode // 'single-row' or 'multi-row'
  } = params;
  
  try {
    const transactions = [];
    const errors = [];
    const skipped = [];
    
    if (groupingMode === 'single-row') {
      // Each row is a complete transaction with debit and credit
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 because: +1 for 0-index, +1 for header row
        
        try {
          const transaction = parseSingleRowTransaction(row, mapping, rowNum);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            row: rowNum,
            error: error.message,
            data: row
          });
        }
      }
    } else {
      // Multi-row mode: group by transaction ID or description
      const grouped = groupTransactionRows(rows, mapping);
      
      for (const [groupKey, groupRows] of Object.entries(grouped)) {
        try {
          const transaction = parseMultiRowTransaction(groupRows, mapping);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          errors.push({
            group: groupKey,
            error: error.message,
            rows: groupRows.length
          });
        }
      }
    }
    
    return {
      success: true,
      transactions,
      totalRows: rows.length,
      imported: transactions.length,
      errors,
      skipped
    };
    
  } catch (error) {
    console.error('Error converting Excel to transactions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse a single row into a transaction
 */
function parseSingleRowTransaction(row, mapping, rowNum) {
  const date = parseDate(row[mapping.date]);
  const description = row[mapping.description] || `Transaction ${rowNum}`;
  const debitAccountNum = parseAccountNumber(row[mapping.debitAccount]);
  const creditAccountNum = parseAccountNumber(row[mapping.creditAccount]);
  const amount = parseAmount(row[mapping.amount]);
  
  if (!date) {
    throw new Error('Invalid or missing date');
  }
  
  if (!debitAccountNum || !creditAccountNum) {
    throw new Error('Missing account number(s)');
  }
  
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }
  
  return {
    transaction_date: date,
    description,
    lines: [
      {
        account_number: debitAccountNum,
        debit: amount,
        credit: 0
      },
      {
        account_number: creditAccountNum,
        debit: 0,
        credit: amount
      }
    ]
  };
}

/**
 * Group rows by transaction (for multi-row mode)
 */
function groupTransactionRows(rows, mapping) {
  const groups = {};
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Use transaction ID if provided, otherwise group by date + description
    let groupKey;
    if (mapping.transactionId !== undefined && mapping.transactionId !== null) {
      groupKey = row[mapping.transactionId] || `tx_${i}`;
    } else {
      const date = row[mapping.date] || '';
      const desc = row[mapping.description] || '';
      groupKey = `${date}_${desc}_${i}`;
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    
    groups[groupKey].push({ row, index: i });
  }
  
  return groups;
}

/**
 * Parse multiple rows into a single transaction
 */
function parseMultiRowTransaction(groupRows, mapping) {
  if (groupRows.length === 0) return null;
  
  const firstRow = groupRows[0].row;
  const date = parseDate(firstRow[mapping.date]);
  const description = firstRow[mapping.description] || 'Transaction';
  
  if (!date) {
    throw new Error('Invalid or missing date');
  }
  
  const lines = [];
  let totalDebit = 0;
  let totalCredit = 0;
  
  for (const { row, index } of groupRows) {
    const accountNum = parseAccountNumber(row[mapping.account]);
    const debit = parseAmount(row[mapping.debit] || 0);
    const credit = parseAmount(row[mapping.credit] || 0);
    
    if (!accountNum) {
      continue; // Skip rows without account numbers
    }
    
    lines.push({
      account_number: accountNum,
      debit,
      credit
    });
    
    totalDebit += debit;
    totalCredit += credit;
  }
  
  if (lines.length === 0) {
    throw new Error('No valid transaction lines');
  }
  
  // Validate balance
  const tolerance = 0.01;
  if (Math.abs(totalDebit - totalCredit) > tolerance) {
    throw new Error(`Transaction not balanced: Debit ${totalDebit} != Credit ${totalCredit}`);
  }
  
  return {
    transaction_date: date,
    description,
    lines
  };
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // If it's already a date object
  if (dateStr instanceof Date) {
    return formatDate(dateStr);
  }
  
  // Handle Excel serial date numbers
  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateStr * 86400000);
    return formatDate(date);
  }
  
  // String parsing
  const str = dateStr.toString().trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // YYYYMMDD
  if (/^\d{8}$/.test(str)) {
    return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
  }
  
  // DD/MM/YYYY or DD.MM.YYYY
  const match = str.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try standard Date parsing as fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatDate(parsed);
  }
  
  return null;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse account number
 */
function parseAccountNumber(value) {
  if (!value) return null;
  
  // Remove any non-digit characters
  const cleaned = value.toString().replace(/\D/g, '');
  
  const num = parseInt(cleaned, 10);
  
  if (isNaN(num) || num < 1000 || num > 9999) {
    return null;
  }
  
  return num;
}

/**
 * Parse amount from various formats
 */
function parseAmount(value) {
  if (value === '' || value == null) return 0;
  
  if (typeof value === 'number') {
    return Math.abs(value);
  }
  
  // String parsing - handle Swedish format
  const cleaned = value
    .toString()
    .replace(/\s/g, '') // Remove spaces
    .replace(',', '.'); // Replace comma with dot
  
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) return 0;
  
  return Math.abs(num);
}

module.exports = {
  parseExcelFile,
  convertExcelToTransactions
};

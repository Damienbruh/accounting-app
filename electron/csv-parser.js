/**
 * CSV Parser for Swedish Bank Statements
 * Supports common Swedish bank formats: SEB, Nordea, Handelsbanken, Swedbank
 */

/**
 * Parse CSV content into bank transactions
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object} Parsed transactions and metadata
 */
function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Try to detect bank format
  const format = detectFormat(lines[0]);
  
  // Parse based on detected format
  switch (format) {
    case 'SEB':
      return parseSEB(lines);
    case 'NORDEA':
      return parseNordea(lines);
    case 'HANDELSBANKEN':
      return parseHandelsbanken(lines);
    case 'SWEDBANK':
      return parseSwedbank(lines);
    default:
      return parseGeneric(lines);
  }
}

/**
 * Detect which Swedish bank format the CSV is
 */
function detectFormat(headerLine) {
  const lower = headerLine.toLowerCase();
  
  if (lower.includes('bokföringsdatum') && lower.includes('valuta')) {
    return 'SEB';
  }
  if (lower.includes('bokföringsdag') || lower.includes('transaktionsdag')) {
    return 'NORDEA';
  }
  if (lower.includes('bokförd') && lower.includes('transaktion')) {
    return 'HANDELSBANKEN';
  }
  if (lower.includes('datum') && lower.includes('text')) {
    return 'SWEDBANK';
  }
  
  return 'GENERIC';
}

/**
 * Parse SEB bank format
 * Format: Bokföringsdatum;Valuta;Belopp;Saldo;Text
 */
function parseSEB(lines) {
  const transactions = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    
    if (parts.length < 4) continue;
    
    const date = parseSwedishDate(parts[0]);
    const amount = parseAmount(parts[2]);
    const balance = parts[3] ? parseAmount(parts[3]) : null;
    const description = parts[4] || parts[2] || 'Unknown';
    
    if (date && !isNaN(amount)) {
      transactions.push({
        transaction_date: date,
        description: description.trim(),
        amount: amount,
        balance: balance,
        reference: `SEB-${i}`
      });
    }
  }
  
  return {
    transactions,
    format: 'SEB',
    count: transactions.length
  };
}

/**
 * Parse Nordea bank format
 * Format: Bokföringsdag;Transaktionsdag;Belopp;Avsändare;Mottagare;Namn;Rubrik;Saldo
 */
function parseNordea(lines) {
  const transactions = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    
    if (parts.length < 3) continue;
    
    const date = parseSwedishDate(parts[0]) || parseSwedishDate(parts[1]);
    const amount = parseAmount(parts[2]);
    const description = [parts[5], parts[6]].filter(Boolean).join(' - ').trim() || 'Unknown';
    const balance = parts[7] ? parseAmount(parts[7]) : null;
    
    if (date && !isNaN(amount)) {
      transactions.push({
        transaction_date: date,
        description: description,
        amount: amount,
        balance: balance,
        reference: `NORDEA-${i}`
      });
    }
  }
  
  return {
    transactions,
    format: 'NORDEA',
    count: transactions.length
  };
}

/**
 * Parse Handelsbanken format
 * Format: Bokförd;Transaktion;Text;Belopp;Saldo
 */
function parseHandelsbanken(lines) {
  const transactions = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    
    if (parts.length < 4) continue;
    
    const date = parseSwedishDate(parts[0]) || parseSwedishDate(parts[1]);
    const description = parts[2] || 'Unknown';
    const amount = parseAmount(parts[3]);
    const balance = parts[4] ? parseAmount(parts[4]) : null;
    
    if (date && !isNaN(amount)) {
      transactions.push({
        transaction_date: date,
        description: description.trim(),
        amount: amount,
        balance: balance,
        reference: `HANDELSBANKEN-${i}`
      });
    }
  }
  
  return {
    transactions,
    format: 'HANDELSBANKEN',
    count: transactions.length
  };
}

/**
 * Parse Swedbank format
 * Format: Datum;Text;Belopp;Saldo;Valuta
 */
function parseSwedbank(lines) {
  const transactions = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    
    if (parts.length < 3) continue;
    
    const date = parseSwedishDate(parts[0]);
    const description = parts[1] || 'Unknown';
    const amount = parseAmount(parts[2]);
    const balance = parts[3] ? parseAmount(parts[3]) : null;
    
    if (date && !isNaN(amount)) {
      transactions.push({
        transaction_date: date,
        description: description.trim(),
        amount: amount,
        balance: balance,
        reference: `SWEDBANK-${i}`
      });
    }
  }
  
  return {
    transactions,
    format: 'SWEDBANK',
    count: transactions.length
  };
}

/**
 * Parse generic CSV format
 * Assumes: Date, Description, Amount, Balance (optional)
 */
function parseGeneric(lines) {
  const transactions = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    
    if (parts.length < 3) continue;
    
    const date = parseSwedishDate(parts[0]);
    const description = parts[1] || 'Unknown';
    const amount = parseAmount(parts[2]);
    const balance = parts.length > 3 ? parseAmount(parts[3]) : null;
    
    if (date && !isNaN(amount)) {
      transactions.push({
        transaction_date: date,
        description: description.trim(),
        amount: amount,
        balance: balance,
        reference: `GENERIC-${i}`
      });
    }
  }
  
  return {
    transactions,
    format: 'GENERIC',
    count: transactions.length
  };
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  let separator = detectSeparator(line);
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    
    if ((char === separator || char === ';' || char === ',') && !inQuotes) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current) {
    parts.push(current.trim());
  }
  
  return parts;
}

/**
 * Detect CSV separator (comma, semicolon, or tab)
 */
function detectSeparator(line) {
  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  
  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  if (tabCount > commaCount) return '\t';
  return ',';
}

/**
 * Parse Swedish date formats
 * Supports: YYYY-MM-DD, YYYYMMDD, DD/MM/YYYY, DD.MM.YYYY
 */
function parseSwedishDate(dateStr) {
  if (!dateStr) return null;
  
  dateStr = dateStr.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // YYYYMMDD
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }
  
  // DD/MM/YYYY or DD.MM.YYYY
  const match = dateStr.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Parse amount from Swedish format
 * Handles: 1234.56, 1 234,56, -1234.56, etc.
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Remove spaces and replace comma with dot
  const cleaned = amountStr
    .toString()
    .replace(/\s/g, '')
    .replace(',', '.');
  
  return parseFloat(cleaned) || 0;
}

module.exports = {
  parseCSV,
  parseSwedishDate,
  parseAmount
};

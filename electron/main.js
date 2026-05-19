const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const initSqlJs = require('sql.js');
const { generateSIE } = require('./sie-generator');
const { parseSIE, validateSIE } = require('./sie-parser');
const { generateProfitAndLoss, generateBalanceSheet, generateCashFlow } = require('./reports');
const { parseCSV } = require('./csv-parser');
const { parseExcelFile, convertExcelToTransactions } = require('./excel-parser');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  console.log('Database path:', dbPath);

  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  let buffer;
  if (fs.existsSync(dbPath)) {
    buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      org_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      account_number INTEGER NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      transaction_date DATE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit DECIMAL(10, 2) DEFAULT 0,
      credit DECIMAL(10, 2) DEFAULT 0,
      vat_rate DECIMAL(5, 2) DEFAULT 0,
      vat_amount DECIMAL(10, 2) DEFAULT 0,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
  `);
  
  // Migration: Add VAT columns if they don't exist
  try {
    const tableInfo = db.exec('PRAGMA table_info(transaction_lines)');
    if (tableInfo.length > 0) {
      const columns = tableInfo[0].values.map(row => row[1]); // column names are in index 1
      
      if (!columns.includes('vat_rate')) {
        console.log('Adding vat_rate column to transaction_lines table');
        db.run('ALTER TABLE transaction_lines ADD COLUMN vat_rate DECIMAL(5, 2) DEFAULT 0');
      }
      
      if (!columns.includes('vat_amount')) {
        console.log('Adding vat_amount column to transaction_lines table');
        db.run('ALTER TABLE transaction_lines ADD COLUMN vat_amount DECIMAL(10, 2) DEFAULT 0');
      }
    }
  } catch (error) {
    console.error('Error running migration:', error);
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      personal_number TEXT,
      email TEXT,
      phone TEXT,
      position TEXT,
      salary DECIMAL(10, 2),
      employment_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      file_data BLOB NOT NULL,
      description TEXT,
      category TEXT,
      document_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      transaction_date DATE NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      balance DECIMAL(10, 2),
      reference TEXT,
      reconciled INTEGER DEFAULT 0,
      matched_transaction_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (matched_transaction_id) REFERENCES transactions(id)
    );
  `);
  
  // Migration: Add reconciliation columns to transactions table
  try {
    const transTableInfo = db.exec('PRAGMA table_info(transactions)');
    if (transTableInfo.length > 0) {
      const columns = transTableInfo[0].values.map(row => row[1]);
      
      if (!columns.includes('reconciled')) {
        console.log('Adding reconciled column to transactions table');
        db.run('ALTER TABLE transactions ADD COLUMN reconciled INTEGER DEFAULT 0');
      }
      
      if (!columns.includes('bank_transaction_id')) {
        console.log('Adding bank_transaction_id column to transactions table');
        db.run('ALTER TABLE transactions ADD COLUMN bank_transaction_id INTEGER');
      }
    }
  } catch (error) {
    console.error('Error running reconciliation migration:', error);
  }

  // Save database to file
  saveDatabase(dbPath);
  
  console.log('Database initialized at:', dbPath);
}

function saveDatabase(dbPath) {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, data);
  }
}

// IPC handlers
ipcMain.handle('get-companies', async () => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM companies');
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
});

ipcMain.handle('add-company', async (event, company) => {
  if (!db) return null;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  db.run(
    'INSERT INTO companies (name, org_number) VALUES (?, ?)',
    [company.name, company.org_number || null]
  );
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  const companyId = result[0].values[0][0];
  
  // Load BAS 2024 accounts for the new company
  try {
    const bas2024Path = path.join(__dirname, 'bas2024-accounts.json');
    const bas2024Data = JSON.parse(fs.readFileSync(bas2024Path, 'utf8'));
    
    // Insert all BAS accounts for this company
    bas2024Data.forEach(account => {
      db.run(
        'INSERT INTO accounts (company_id, account_number, account_name, account_type) VALUES (?, ?, ?, ?)',
        [companyId, account.number, account.name, account.type]
      );
    });
    
    console.log(`Loaded ${bas2024Data.length} BAS 2024 accounts for company ${companyId}`);
  } catch (error) {
    console.error('Error loading BAS 2024 accounts:', error);
  }
  
  saveDatabase(dbPath);
  
  return companyId;
});

ipcMain.handle('update-company', async (event, company) => {
  if (!db) return false;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  db.run(
    'UPDATE companies SET name = ?, org_number = ? WHERE id = ?',
    [company.name, company.org_number || null, company.id]
  );
  
  saveDatabase(dbPath);
  return true;
});

ipcMain.handle('delete-company', async (event, companyId) => {
  if (!db) return false;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  // Delete all related data
  db.run('DELETE FROM employees WHERE company_id = ?', [companyId]);
  db.run('DELETE FROM documents WHERE company_id = ?', [companyId]);
  db.run('DELETE FROM accounts WHERE company_id = ?', [companyId]);
  db.run('DELETE FROM transactions WHERE company_id = ?', [companyId]);
  
  // Delete the company
  db.run('DELETE FROM companies WHERE id = ?', [companyId]);
  
  saveDatabase(dbPath);
  return true;
});

// Employee handlers
ipcMain.handle('get-employees', async (event, companyId) => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM employees WHERE company_id = ?', [companyId]);
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
});

ipcMain.handle('add-employee', async (event, employee) => {
  if (!db) return null;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  db.run(
    'INSERT INTO employees (company_id, first_name, last_name, personal_number, email, phone, position, salary, employment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      employee.company_id,
      employee.first_name,
      employee.last_name,
      employee.personal_number || null,
      employee.email || null,
      employee.phone || null,
      employee.position || null,
      employee.salary || null,
      employee.employment_date || null
    ]
  );
  
  saveDatabase(dbPath);
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0].values[0][0];
});

ipcMain.handle('update-employee', async (event, employee) => {
  if (!db) return false;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  db.run(
    'UPDATE employees SET first_name = ?, last_name = ?, personal_number = ?, email = ?, phone = ?, position = ?, salary = ?, employment_date = ? WHERE id = ?',
    [
      employee.first_name,
      employee.last_name,
      employee.personal_number || null,
      employee.email || null,
      employee.phone || null,
      employee.position || null,
      employee.salary || null,
      employee.employment_date || null,
      employee.id
    ]
  );
  
  saveDatabase(dbPath);
  return true;
});

ipcMain.handle('delete-employee', async (event, employeeId) => {
  if (!db) return false;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  db.run('DELETE FROM employees WHERE id = ?', [employeeId]);
  
  saveDatabase(dbPath);
  return true;
});

// Document handlers
ipcMain.handle('get-documents', async (event, companyId) => {
  if (!db) return [];
  // Get document metadata without the file_data blob
  const result = db.exec('SELECT id, company_id, file_name, file_type, file_size, description, category, document_date, created_at FROM documents WHERE company_id = ? ORDER BY created_at DESC', [companyId]);
  if (result.length === 0) {
    console.log(`No documents found for company ${companyId}`);
    return [];
  }
  
  const columns = result[0].columns;
  const values = result[0].values;
  const documents = values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
  console.log(`Retrieved ${documents.length} documents for company ${companyId}:`, documents.map(d => d.file_name));
  return documents;
});

ipcMain.handle('upload-document', async (event, document) => {
  if (!db) return null;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  console.log('Upload document requested for company:', document.company_id);
  
  // Show file picker
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) {
    console.log('File selection canceled');
    return null;
  }
  
  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(filePath);
  const fileData = fs.readFileSync(filePath);
  const fileSize = fileData.length;
  
  console.log(`Uploading file: ${fileName} (${fileSize} bytes) for company ${document.company_id}`);
  
  db.run(
    'INSERT INTO documents (company_id, file_name, file_type, file_size, file_data, description, category, document_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      document.company_id,
      fileName,
      fileExtension,
      fileSize,
      fileData,
      document.description || null,
      document.category || null,
      document.document_date || null
    ]
  );
  
  saveDatabase(dbPath);
  
  // Get the ID of the just-inserted document
  const insertResult = db.exec(
    'SELECT id FROM documents WHERE company_id = ? AND file_name = ? ORDER BY id DESC LIMIT 1',
    [document.company_id, fileName]
  );
  const documentId = insertResult[0].values[0][0];
  console.log(`Document uploaded successfully with ID: ${documentId}`);
  return documentId;
});

ipcMain.handle('download-document', async (event, documentId) => {
  if (!db) return false;
  
  // Get document from database
  const result = db.exec('SELECT file_name, file_type, file_data FROM documents WHERE id = ?', [documentId]);
  if (result.length === 0) return false;
  
  const fileName = result[0].values[0][0];
  const fileData = result[0].values[0][2];
  
  // Show save dialog
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    defaultPath: fileName,
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (saveResult.canceled) return false;
  
  // Write file
  fs.writeFileSync(saveResult.filePath, Buffer.from(fileData));
  return true;
});

ipcMain.handle('view-document', async (event, documentId) => {
  if (!db) return false;
  
  try {
    // Get document from database
    const result = db.exec('SELECT file_name, file_data FROM documents WHERE id = ?', [documentId]);
    if (result.length === 0) return false;
    
    const fileName = result[0].values[0][0];
    const fileData = result[0].values[0][1];
    
    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, fileName);
    
    // Write file to temp directory
    fs.writeFileSync(tempFilePath, Buffer.from(fileData));
    
    // Open with system default application
    await shell.openPath(tempFilePath);
    
    return true;
  } catch (error) {
    console.error('Error viewing document:', error);
    return false;
  }
});

ipcMain.handle('delete-document', async (event, documentId) => {
  if (!db) return false;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  db.run('DELETE FROM documents WHERE id = ?', [documentId]);
  
  saveDatabase(dbPath);
  return true;
});

// Account handlers
ipcMain.handle('get-accounts', async (event, companyId) => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM accounts WHERE company_id = ? ORDER BY account_number', [companyId]);
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
});

// Transaction handlers
ipcMain.handle('get-transactions', async (event, companyId) => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM transactions WHERE company_id = ? ORDER BY transaction_date DESC, id DESC', [companyId]);
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
});

ipcMain.handle('get-transaction-lines', async (event, transactionId) => {
  if (!db) return [];
  const result = db.exec(
    `SELECT tl.*, a.account_number, a.account_name 
     FROM transaction_lines tl 
     JOIN accounts a ON tl.account_id = a.id 
     WHERE tl.transaction_id = ?`,
    [transactionId]
  );
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
});

ipcMain.handle('add-transaction', async (event, transaction) => {
  if (!db) return null;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  try {
    // Insert transaction
    db.run(
      'INSERT INTO transactions (company_id, transaction_date, description) VALUES (?, ?, ?)',
      [transaction.company_id, transaction.transaction_date, transaction.description || null]
    );
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    const transactionId = result[0].values[0][0];
    
    // Insert transaction lines
    if (transaction.lines && transaction.lines.length > 0) {
      transaction.lines.forEach(line => {
        db.run(
          'INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, vat_rate, vat_amount) VALUES (?, ?, ?, ?, ?, ?)',
          [
            transactionId,
            line.account_id,
            line.debit || 0,
            line.credit || 0,
            line.vat_rate || 0,
            line.vat_amount || 0
          ]
        );
      });
    }
    
    saveDatabase(dbPath);
    return transactionId;
  } catch (error) {
    console.error('Error adding transaction:', error);
    return null;
  }
});

ipcMain.handle('delete-transaction', async (event, transactionId) => {
  if (!db) return false;
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  try {
    // Delete transaction lines first
    db.run('DELETE FROM transaction_lines WHERE transaction_id = ?', [transactionId]);
    
    // Delete transaction
    db.run('DELETE FROM transactions WHERE id = ?', [transactionId]);
    
    saveDatabase(dbPath);
    return true;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }
});

// SIE Import handler
ipcMain.handle('import-sie', async (event, { companyId, createNewCompany }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  try {
    // Show open file dialog
    const openResult = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'SIE Files', extensions: ['se'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (openResult.canceled) {
      return { success: false, error: 'Import canceled' };
    }
    
    const filePath = openResult.filePaths[0];
    console.log(`Importing SIE file from: ${filePath}`);
    
    // Read and parse SIE file with proper encoding handling
    const fileBuffer = fs.readFileSync(filePath);
    // Decode latin1 buffer to proper UTF-8 string
    const fileContent = Buffer.from(fileBuffer.toString('binary'), 'binary').toString('latin1');
    const parsedData = parseSIE(fileContent);
    
    // Validate parsed data
    const validation = validateSIE(parsedData);
    if (!validation.valid) {
      return { success: false, error: `Invalid SIE file: ${validation.errors.join(', ')}` };
    }
    
    let targetCompanyId = companyId;
    
    // Create new company if requested
    if (createNewCompany) {
      db.run(
        'INSERT INTO companies (name, org_number) VALUES (?, ?)',
        [parsedData.company.name, parsedData.company.org_number || null]
      );
      
      const result = db.exec('SELECT last_insert_rowid() as id');
      targetCompanyId = result[0].values[0][0];
      console.log(`Created new company with ID: ${targetCompanyId}`);
    }
    
    // Import accounts
    let accountsImported = 0;
    const accountMap = {}; // Maps account_number to account_id
    
    for (const account of parsedData.accounts) {
      // Check if account already exists
      const existingResult = db.exec(
        'SELECT id FROM accounts WHERE company_id = ? AND account_number = ?',
        [targetCompanyId, account.account_number]
      );
      
      if (existingResult.length > 0 && existingResult[0].values.length > 0) {
        // Account exists, use existing ID
        accountMap[account.account_number] = existingResult[0].values[0][0];
      } else {
        // Insert new account
        db.run(
          'INSERT INTO accounts (company_id, account_number, account_name, account_type) VALUES (?, ?, ?, ?)',
          [targetCompanyId, account.account_number, account.account_name, account.account_type]
        );
        
        const result = db.exec('SELECT last_insert_rowid() as id');
        accountMap[account.account_number] = result[0].values[0][0];
        accountsImported++;
      }
    }
    
    // Import transactions
    let transactionsImported = 0;
    
    for (const transaction of parsedData.transactions) {
      // Check for duplicate transaction by date + description
      const duplicateCheck = db.exec(
        'SELECT id FROM transactions WHERE company_id = ? AND transaction_date = ? AND description = ?',
        [targetCompanyId, transaction.transaction_date, transaction.description]
      );
      
      if (duplicateCheck.length > 0 && duplicateCheck[0].values.length > 0) {
        console.log(`Skipping duplicate transaction: ${transaction.description} on ${transaction.transaction_date}`);
        continue;
      }
      
      // Insert transaction
      db.run(
        'INSERT INTO transactions (company_id, transaction_date, description) VALUES (?, ?, ?)',
        [targetCompanyId, transaction.transaction_date, transaction.description]
      );
      
      const result = db.exec('SELECT last_insert_rowid() as id');
      const transactionId = result[0].values[0][0];
      
      // Insert transaction lines
      for (const line of transaction.lines) {
        const accountId = accountMap[line.account_number];
        if (!accountId) {
          console.warn(`Account number ${line.account_number} not found, skipping line`);
          continue;
        }
        
        db.run(
          'INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, vat_rate, vat_amount) VALUES (?, ?, ?, ?, ?, ?)',
          [
            transactionId,
            accountId,
            line.debit || 0,
            line.credit || 0,
            0, // VAT data not typically in SIE files
            0
          ]
        );
      }
      
      transactionsImported++;
    }
    
    // Handle SIE 5 opening and closing balances
    // Note: Balances are informational - they show account states
    // We log them but don't create separate transactions for them
    let balancesInfo = '';
    if (parsedData.openingBalances.length > 0 || parsedData.closingBalances.length > 0) {
      balancesInfo = ` (${parsedData.openingBalances.length} opening balances, ${parsedData.closingBalances.length} closing balances)`;
      console.log(`SIE 5 file contains balances: ${parsedData.openingBalances.length} opening, ${parsedData.closingBalances.length} closing`);
    }
    
    saveDatabase(dbPath);
    
    const sieTypeLabel = parsedData.sieType ? `SIE Type ${parsedData.sieType}` : 'SIE';
    console.log(`Import complete from ${sieTypeLabel}: ${accountsImported} accounts, ${transactionsImported} transactions${balancesInfo}`);
    
    if (parsedData.skippedTransactions.length > 0) {
      console.log(`Warning: ${parsedData.skippedTransactions.length} unbalanced transactions were skipped`);
    }
    
    return {
      success: true,
      summary: {
        accounts: accountsImported,
        transactions: transactionsImported,
        companyName: parsedData.company.name,
        companyId: targetCompanyId,
        sieType: parsedData.sieType,
        hasBalances: parsedData.openingBalances.length > 0 || parsedData.closingBalances.length > 0,
        skippedTransactions: parsedData.skippedTransactions
      }
    };
    
  } catch (error) {
    console.error('Error importing SIE:', error);
    return { success: false, error: error.message };
  }
});

// SIE Export handler
ipcMain.handle('export-sie', async (event, { companyId, startDate, endDate }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Get company information
    const companyResult = db.exec('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (companyResult.length === 0) {
      return { success: false, error: 'Company not found' };
    }
    
    const companyData = {};
    const companyCols = companyResult[0].columns;
    const companyVals = companyResult[0].values[0];
    companyCols.forEach((col, idx) => {
      companyData[col] = companyVals[idx];
    });
    
    // Get accounts
    const accountsResult = db.exec(
      'SELECT * FROM accounts WHERE company_id = ? ORDER BY account_number',
      [companyId]
    );
    const accounts = [];
    if (accountsResult.length > 0) {
      const cols = accountsResult[0].columns;
      accountsResult[0].values.forEach(row => {
        const acc = {};
        cols.forEach((col, idx) => {
          acc[col] = row[idx];
        });
        accounts.push(acc);
      });
    }
    
    // Get transactions with their lines in the date range
    const transactionsResult = db.exec(
      'SELECT * FROM transactions WHERE company_id = ? AND transaction_date >= ? AND transaction_date <= ? ORDER BY transaction_date, id',
      [companyId, startDate, endDate]
    );
    
    const transactions = [];
    if (transactionsResult.length > 0) {
      const cols = transactionsResult[0].columns;
      for (const row of transactionsResult[0].values) {
        const trans = {};
        cols.forEach((col, idx) => {
          trans[col] = row[idx];
        });
        
        // Get transaction lines with account numbers
        const linesResult = db.exec(
          `SELECT tl.*, a.account_number, a.account_name
           FROM transaction_lines tl
           JOIN accounts a ON tl.account_id = a.id
           WHERE tl.transaction_id = ?`,
          [trans.id]
        );
        
        trans.lines = [];
        if (linesResult.length > 0) {
          const lineCols = linesResult[0].columns;
          linesResult[0].values.forEach(lineRow => {
            const line = {};
            lineCols.forEach((col, idx) => {
              line[col] = lineRow[idx];
            });
            trans.lines.push(line);
          });
        }
        
        transactions.push(trans);
      }
    }
    
    // Generate SIE content
    const sieContent = generateSIE({
      company: companyData,
      accounts,
      transactions,
      startDate,
      endDate
    });
    
    // Show save dialog
    const suggestedFileName = `${companyData.name.replace(/[^a-z0-9]/gi, '_')}_${startDate}_${endDate}.se`;
    const saveResult = await dialog.showSaveDialog(mainWindow, {
      defaultPath: suggestedFileName,
      filters: [
        { name: 'SIE Files', extensions: ['se'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (saveResult.canceled) {
      return { success: false, error: 'Export canceled' };
    }
    
    // Write SIE file
    fs.writeFileSync(saveResult.filePath, sieContent, 'latin1');
    
    console.log(`SIE file exported successfully to: ${saveResult.filePath}`);
    return { success: true, filePath: saveResult.filePath };
    
  } catch (error) {
    console.error('Error exporting SIE:', error);
    return { success: false, error: error.message };
  }
});

// Report handlers
ipcMain.handle('get-profit-loss', async (event, { companyId, startDate, endDate }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const report = generateProfitAndLoss(db, companyId, startDate, endDate);
    return { success: true, report };
  } catch (error) {
    console.error('Error generating P&L:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-balance-sheet', async (event, { companyId, asOfDate }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const report = generateBalanceSheet(db, companyId, asOfDate);
    return { success: true, report };
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cash-flow', async (event, { companyId, startDate, endDate }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const report = generateCashFlow(db, companyId, startDate, endDate);
    return { success: true, report };
  } catch (error) {
    console.error('Error generating cash flow:', error);
    return { success: false, error: error.message };
  }
});

// Bank reconciliation handlers
ipcMain.handle('import-bank-statement', async (event, { companyId }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Show file dialog
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: 'Import canceled' };
    }
    
    const filePath = result.filePaths[0];
    
    // Read CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Parse CSV
    const parseResult = parseCSV(fileContent);
    
    // Insert into database
    let imported = 0;
    for (const transaction of parseResult.transactions) {
      db.run(
        `INSERT INTO bank_transactions 
         (company_id, transaction_date, description, amount, balance, reference, reconciled)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          companyId,
          transaction.transaction_date,
          transaction.description,
          transaction.amount,
          transaction.balance,
          transaction.reference
        ]
      );
      imported++;
    }
    
    console.log(`Imported ${imported} bank transactions from ${parseResult.format} format`);
    
    return {
      success: true,
      imported,
      format: parseResult.format
    };
    
  } catch (error) {
    console.error('Error importing bank statement:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-bank-transactions', async (event, { companyId, startDate, endDate }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    let query = `
      SELECT 
        bt.*,
        t.description as matched_description,
        t.transaction_date as matched_date
      FROM bank_transactions bt
      LEFT JOIN transactions t ON bt.matched_transaction_id = t.id
      WHERE bt.company_id = ?
    `;
    
    const params = [companyId];
    
    if (startDate) {
      query += ' AND bt.transaction_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND bt.transaction_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY bt.transaction_date DESC, bt.id DESC';
    
    const result = db.exec(query, params);
    
    if (result.length === 0) {
      return { success: true, transactions: [] };
    }
    
    const cols = result[0].columns;
    const transactions = result[0].values.map(row => {
      const trans = {};
      cols.forEach((col, idx) => {
        trans[col] = row[idx];
      });
      return trans;
    });
    
    return { success: true, transactions };
    
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('match-transaction', async (event, { bankTransactionId, accountingTransactionId }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Update bank transaction
    db.run(
      `UPDATE bank_transactions 
       SET reconciled = 1, matched_transaction_id = ?
       WHERE id = ?`,
      [accountingTransactionId, bankTransactionId]
    );
    
    // Update accounting transaction
    db.run(
      `UPDATE transactions 
       SET reconciled = 1, bank_transaction_id = ?
       WHERE id = ?`,
      [bankTransactionId, accountingTransactionId]
    );
    
    console.log(`Matched bank transaction ${bankTransactionId} with accounting transaction ${accountingTransactionId}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error matching transactions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('unmatch-transaction', async (event, { bankTransactionId }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Get the matched transaction ID first
    const result = db.exec(
      'SELECT matched_transaction_id FROM bank_transactions WHERE id = ?',
      [bankTransactionId]
    );
    
    if (result.length === 0 || !result[0].values[0][0]) {
      return { success: false, error: 'No match found to unmatch' };
    }
    
    const accountingTransactionId = result[0].values[0][0];
    
    // Update bank transaction
    db.run(
      `UPDATE bank_transactions 
       SET reconciled = 0, matched_transaction_id = NULL
       WHERE id = ?`,
      [bankTransactionId]
    );
    
    // Update accounting transaction
    db.run(
      `UPDATE transactions 
       SET reconciled = 0, bank_transaction_id = NULL
       WHERE id = ?`,
      [accountingTransactionId]
    );
    
    console.log(`Unmatched bank transaction ${bankTransactionId}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error unmatching transaction:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-unreconciled-transactions', async (event, { companyId, startDate, endDate }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    let query = `
      SELECT 
        t.id,
        t.transaction_date,
        t.description,
        SUM(CASE WHEN tl.credit > 0 THEN tl.credit ELSE 0 END) as credit_total,
        SUM(CASE WHEN tl.debit > 0 THEN tl.debit ELSE 0 END) as debit_total
      FROM transactions t
      JOIN transaction_lines tl ON t.id = tl.transaction_id
      WHERE t.company_id = ? AND t.reconciled = 0
    `;
    
    const params = [companyId];
    
    if (startDate) {
      query += ' AND t.transaction_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND t.transaction_date <= ?';
      params.push(endDate);
    }
    
    query += ' GROUP BY t.id ORDER BY t.transaction_date DESC';
    
    const result = db.exec(query, params);
    
    if (result.length === 0) {
      return { success: true, transactions: [] };
    }
    
    const cols = result[0].columns;
    const transactions = result[0].values.map(row => {
      const trans = {};
      cols.forEach((col, idx) => {
        trans[col] = row[idx];
      });
      return trans;
    });
    
    return { success: true, transactions };
    
  } catch (error) {
    console.error('Error fetching unreconciled transactions:', error);
    return { success: false, error: error.message };
  }
});

// Excel import handlers
ipcMain.handle('read-excel-file', async () => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Show file dialog
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: 'File selection canceled' };
    }
    
    const filePath = result.filePaths[0];
    
    // Read Excel file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Parse Excel file
    const parseResult = parseExcelFile(fileBuffer);
    
    if (!parseResult.success) {
      return parseResult;
    }
    
    console.log(`Parsed Excel file: ${parseResult.totalRows} rows, ${parseResult.columnCount} columns`);
    
    return parseResult;
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-excel-transactions', async (event, { companyId, rows, mapping, groupingMode }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  const dbPath = path.join(app.getPath('userData'), 'accounting.db');
  
  try {
    // Convert Excel data to transactions
    const convertResult = convertExcelToTransactions({
      rows,
      mapping,
      companyId,
      groupingMode
    });
    
    if (!convertResult.success) {
      return convertResult;
    }
    
    // Get account map for the company
    const accountMapResult = db.exec(
      'SELECT id, account_number FROM accounts WHERE company_id = ?',
      [companyId]
    );
    
    const accountMap = {};
    if (accountMapResult.length > 0) {
      accountMapResult[0].values.forEach(row => {
        accountMap[row[1]] = row[0]; // account_number -> account_id
      });
    }
    
    let imported = 0;
    const errors = convertResult.errors || [];
    
    // Import transactions
    for (const transaction of convertResult.transactions) {
      try {
        // Insert transaction
        db.run(
          'INSERT INTO transactions (company_id, transaction_date, description) VALUES (?, ?, ?)',
          [companyId, transaction.transaction_date, transaction.description]
        );
        
        const result = db.exec('SELECT last_insert_rowid() as id');
        const transactionId = result[0].values[0][0];
        
        // Insert transaction lines
        for (const line of transaction.lines) {
          const accountId = accountMap[line.account_number];
          
          if (!accountId) {
            errors.push({
              transaction: transaction.description,
              error: `Account ${line.account_number} not found`
            });
            continue;
          }
          
          db.run(
            'INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES (?, ?, ?, ?)',
            [transactionId, accountId, line.debit, line.credit]
          );
        }
        
        imported++;
      } catch (error) {
        errors.push({
          transaction: transaction.description,
          error: error.message
        });
      }
    }
    
    saveDatabase(dbPath);
    
    console.log(`Excel import complete: ${imported} transactions imported`);
    
    return {
      success: true,
      imported,
      totalProcessed: convertResult.transactions.length,
      errors
    };
    
  } catch (error) {
    console.error('Error importing Excel transactions:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    const dbPath = path.join(app.getPath('userData'), 'accounting.db');
    saveDatabase(dbPath);
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (db) {
    const dbPath = path.join(app.getPath('userData'), 'accounting.db');
    saveDatabase(dbPath);
    db.close();
  }
});

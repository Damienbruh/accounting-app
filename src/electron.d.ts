export interface ElectronAPI {
  // Company methods
  getCompanies: () => Promise<Company[]>;
  addCompany: (company: { name: string; org_number?: string }) => Promise<number>;
  updateCompany: (company: { id: number; name: string; org_number?: string }) => Promise<boolean>;
  deleteCompany: (companyId: number) => Promise<boolean>;
  
  // Employee methods
  getEmployees: (companyId: number) => Promise<Employee[]>;
  addEmployee: (employee: Omit<Employee, 'id' | 'created_at'>) => Promise<number>;
  updateEmployee: (employee: Omit<Employee, 'created_at'>) => Promise<boolean>;
  deleteEmployee: (employeeId: number) => Promise<boolean>;
  
  // Document methods
  getDocuments: (companyId: number) => Promise<Document[]>;
  uploadDocument: (document: { company_id: number; description?: string; category?: string; document_date?: string }) => Promise<number | null>;
  viewDocument: (documentId: number) => Promise<boolean>;
  downloadDocument: (documentId: number) => Promise<boolean>;
  deleteDocument: (documentId: number) => Promise<boolean>;
  
  // Account methods
  getAccounts: (companyId: number) => Promise<Account[]>;
  
  // Transaction methods
  getTransactions: (companyId: number) => Promise<Transaction[]>;
  getTransactionLines: (transactionId: number) => Promise<TransactionLine[]>;
  addTransaction: (transaction: { company_id: number; transaction_date: string; description?: string; lines: { account_id: number; debit: number; credit: number; vat_rate?: number; vat_amount?: number }[] }) => Promise<number | null>;
  deleteTransaction: (transactionId: number) => Promise<boolean>;
  
  // SIE Export
  exportSIE: (params: { companyId: number; startDate: string; endDate: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  
  // Reports
  getProfitLoss: (params: { companyId: number; startDate: string; endDate: string }) => Promise<{ success: boolean; report?: any; error?: string }>;
  getBalanceSheet: (params: { companyId: number; asOfDate: string }) => Promise<{ success: boolean; report?: any; error?: string }>;
  getCashFlow: (params: { companyId: number; startDate: string; endDate: string }) => Promise<{ success: boolean; report?: any; error?: string }>;
  
  // SIE Import
  importSIE: (params: { companyId?: number; createNewCompany?: boolean }) => Promise<{ 
    success: boolean; 
    summary?: { 
      accounts: number; 
      transactions: number; 
      companyName: string; 
      companyId: number;
      sieType?: number;
      hasBalances?: boolean;
      skippedTransactions?: Array<{
        description: string;
        transaction_date: string;
        totalDebit: number;
        totalCredit: number;
        difference: number;
        lines: Array<{ account_number: number; debit: number; credit: number }>;
      }>;
    }; 
    error?: string 
  }>;
  
  // Bank Reconciliation
  importBankStatement: (params: { companyId: number }) => Promise<{ success: boolean; imported?: number; format?: string; error?: string }>;
  getBankTransactions: (params: { companyId: number; startDate?: string; endDate?: string }) => Promise<{ success: boolean; transactions?: BankTransaction[]; error?: string }>;
  matchTransaction: (params: { bankTransactionId: number; accountingTransactionId: number }) => Promise<{ success: boolean; error?: string }>;
  unmatchTransaction: (params: { bankTransactionId: number }) => Promise<{ success: boolean; error?: string }>;
  getUnreconciledTransactions: (params: { companyId: number; startDate?: string; endDate?: string }) => Promise<{ success: boolean; transactions?: UnreconciledTransaction[]; error?: string }>;
  
  // Excel Import
  readExcelFile: () => Promise<ExcelParseResult>;
  importExcelTransactions: (params: { companyId: number; rows: any[][]; mapping: ExcelColumnMapping; groupingMode: 'single-row' | 'multi-row' }) => Promise<{ success: boolean; imported?: number; totalProcessed?: number; errors?: ExcelImportError[]; error?: string }>;
}

export interface Company {
  id: number;
  name: string;
  org_number?: string;
  created_at: string;
}

export interface Employee {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  personal_number?: string;
  email?: string;
  phone?: string;
  position?: string;
  salary?: number;
  employment_date?: string;
  created_at: string;
}

export interface Document {
  id: number;
  company_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  description?: string;
  category?: string;
  document_date?: string;
  created_at: string;
}

export interface Account {
  id: number;
  company_id: number;
  account_number: number;
  account_name: string;
  account_type: string;
}

export interface Transaction {
  id: number;
  company_id: number;
  transaction_date: string;
  description?: string;
  created_at: string;
}

export interface TransactionLine {
  id: number;
  transaction_id: number;
  account_id: number;
  account_number: number;
  account_name: string;
  debit: number;
  credit: number;
  vat_rate: number;
  vat_amount: number;
}

export interface BankTransaction {
  id: number;
  company_id: number;
  transaction_date: string;
  description: string;
  amount: number;
  balance?: number;
  reference?: string;
  reconciled: number;
  matched_transaction_id?: number;
  matched_description?: string;
  matched_date?: string;
  created_at: string;
}

export interface UnreconciledTransaction {
  id: number;
  transaction_date: string;
  description: string;
  credit_total: number;
  debit_total: number;
}

export interface ExcelParseResult {
  success: boolean;
  sheetNames?: string[];
  selectedSheet?: string;
  headers?: string[];
  columnCount?: number;
  totalRows?: number;
  previewRows?: any[][];
  allRows?: any[][];
  error?: string;
}

export interface ExcelColumnMapping {
  // For single-row mode
  date?: number;
  description?: number;
  debitAccount?: number;
  creditAccount?: number;
  amount?: number;
  
  // For multi-row mode
  account?: number;
  debit?: number;
  credit?: number;
  transactionId?: number;
}

export interface ExcelImportError {
  row?: number;
  group?: string;
  transaction?: string;
  error: string;
  data?: any;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

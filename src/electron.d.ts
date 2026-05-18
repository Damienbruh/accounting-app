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
  addTransaction: (transaction: { company_id: number; transaction_date: string; description?: string; lines: { account_id: number; debit: number; credit: number }[] }) => Promise<number | null>;
  deleteTransaction: (transactionId: number) => Promise<boolean>;
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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

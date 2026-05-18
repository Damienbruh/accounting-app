const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Company methods
  getCompanies: () => ipcRenderer.invoke('get-companies'),
  addCompany: (company) => ipcRenderer.invoke('add-company', company),
  updateCompany: (company) => ipcRenderer.invoke('update-company', company),
  deleteCompany: (companyId) => ipcRenderer.invoke('delete-company', companyId),
  
  // Employee methods
  getEmployees: (companyId) => ipcRenderer.invoke('get-employees', companyId),
  addEmployee: (employee) => ipcRenderer.invoke('add-employee', employee),
  updateEmployee: (employee) => ipcRenderer.invoke('update-employee', employee),
  deleteEmployee: (employeeId) => ipcRenderer.invoke('delete-employee', employeeId),
  
  // Document methods
  getDocuments: (companyId) => ipcRenderer.invoke('get-documents', companyId),
  uploadDocument: (document) => ipcRenderer.invoke('upload-document', document),
  viewDocument: (documentId) => ipcRenderer.invoke('view-document', documentId),
  downloadDocument: (documentId) => ipcRenderer.invoke('download-document', documentId),
  deleteDocument: (documentId) => ipcRenderer.invoke('delete-document', documentId),
  
  // Account methods
  getAccounts: (companyId) => ipcRenderer.invoke('get-accounts', companyId),
  
  // Transaction methods
  getTransactions: (companyId) => ipcRenderer.invoke('get-transactions', companyId),
  getTransactionLines: (transactionId) => ipcRenderer.invoke('get-transaction-lines', transactionId),
  addTransaction: (transaction) => ipcRenderer.invoke('add-transaction', transaction),
  deleteTransaction: (transactionId) => ipcRenderer.invoke('delete-transaction', transactionId),
});

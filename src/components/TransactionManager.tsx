import { useState, useEffect } from 'react';
import type { Account, Transaction, TransactionLine } from '../electron.d';
import './TransactionManager.css';

interface TransactionManagerProps {
  companyId: number;
}

export default function TransactionManager({ companyId }: TransactionManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [transactionLines, setTransactionLines] = useState<TransactionLine[]>([]);
  const [accountFilter, setAccountFilter] = useState('');

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, [companyId]);

  const loadAccounts = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getAccounts(companyId);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadTransactions = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getTransactions(companyId);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadTransactionLines = async (transactionId: number) => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getTransactionLines(transactionId);
      setTransactionLines(data);
      setSelectedTransaction(transactionId);
    } catch (error) {
      console.error('Error loading transaction lines:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!window.electronAPI) return;
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await window.electronAPI.deleteTransaction(transactionId);
      await loadTransactions();
      if (selectedTransaction === transactionId) {
        setSelectedTransaction(null);
        setTransactionLines([]);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const filteredAccounts = accountFilter
    ? accounts.filter(
        (acc) =>
          acc.account_number.toString().includes(accountFilter) ||
          acc.account_name.toLowerCase().includes(accountFilter.toLowerCase())
      )
    : accounts;

  return (
    <div className="transaction-manager">
      <div className="transaction-header">
        <h3>Transactions ({transactions.length})</h3>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          New Transaction
        </button>
      </div>

      {showForm && (
        <TransactionForm
          companyId={companyId}
          accounts={accounts}
          onSave={async () => {
            setShowForm(false);
            await loadTransactions();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="transaction-content">
        <div className="transaction-list">
          <h4>Recent Transactions</h4>
          {transactions.length === 0 ? (
            <p>No transactions yet. Create your first transaction.</p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`transaction-card ${selectedTransaction === transaction.id ? 'selected' : ''}`}
                onClick={() => loadTransactionLines(transaction.id)}
              >
                <div className="transaction-info">
                  <div className="transaction-date">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </div>
                  <div className="transaction-description">
                    {transaction.description || 'No description'}
                  </div>
                </div>
                <button
                  className="btn-small btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTransaction(transaction.id);
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {selectedTransaction && (
          <div className="transaction-details">
            <h4>Transaction Details</h4>
            <table className="transaction-lines-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>VAT Rate</th>
                  <th>VAT Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactionLines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      {line.account_number} - {line.account_name}
                    </td>
                    <td className="amount">{line.debit > 0 ? line.debit.toFixed(2) : ''}</td>
                    <td className="amount">{line.credit > 0 ? line.credit.toFixed(2) : ''}</td>
                    <td className="amount">{line.vat_rate > 0 ? `${line.vat_rate}%` : ''}</td>
                    <td className="amount">{line.vat_amount > 0 ? line.vat_amount.toFixed(2) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>Total</strong></td>
                  <td className="amount">
                    <strong>
                      {transactionLines.reduce((sum, line) => sum + line.debit, 0).toFixed(2)}
                    </strong>
                  </td>
                  <td className="amount">
                    <strong>
                      {transactionLines.reduce((sum, line) => sum + line.credit, 0).toFixed(2)}
                    </strong>
                  </td>
                  <td></td>
                  <td className="amount">
                    <strong>
                      {transactionLines.reduce((sum, line) => sum + line.vat_amount, 0).toFixed(2)}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="accounts-reference">
        <h4>Account Reference (BAS 2024)</h4>
        <input
          type="text"
          placeholder="Search accounts..."
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="account-search"
        />
        <div className="accounts-list">
          {filteredAccounts.map((account) => (
            <div key={account.id} className="account-item">
              <span className="account-number">{account.account_number}</span>
              <span className="account-name">{account.account_name}</span>
              <span className="account-type">{account.account_type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TransactionFormProps {
  companyId: number;
  accounts: Account[];
  onSave: () => void;
  onCancel: () => void;
}

interface TransactionLineInput {
  account_id: string;
  debit: string;
  credit: string;
  vat_rate: string;
  vat_amount: string;
}

function TransactionForm({ companyId, accounts, onSave, onCancel }: TransactionFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<TransactionLineInput[]>([
    { account_id: '', debit: '', credit: '', vat_rate: '0', vat_amount: '' },
    { account_id: '', debit: '', credit: '', vat_rate: '0', vat_amount: '' },
  ]);

  const addLine = () => {
    setLines([...lines, { account_id: '', debit: '', credit: '', vat_rate: '0', vat_amount: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof TransactionLineInput, value: string) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    
    // Auto-calculate VAT amount when amount or VAT rate changes
    if (field === 'debit' || field === 'credit' || field === 'vat_rate') {
      const amount = parseFloat(newLines[index].debit || newLines[index].credit || '0');
      const vatRate = parseFloat(newLines[index].vat_rate || '0');
      
      if (amount > 0 && vatRate > 0) {
        const vatAmount = (amount * vatRate) / 100;
        newLines[index].vat_amount = vatAmount.toFixed(2);
      } else {
        newLines[index].vat_amount = '';
      }
    }
    
    setLines(newLines);
  };

  const calculateBalance = () => {
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;

    const balance = calculateBalance();
    if (Math.abs(balance.difference) > 0.01) {
      alert(`Transaction is not balanced! Debit: ${balance.totalDebit.toFixed(2)}, Credit: ${balance.totalCredit.toFixed(2)}`);
      return;
    }

    const validLines = lines.filter(
      (line) => line.account_id && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0)
    );

    if (validLines.length < 2) {
      alert('A transaction must have at least 2 lines.');
      return;
    }

    try {
      await window.electronAPI.addTransaction({
        company_id: companyId,
        transaction_date: date,
        description,
        lines: validLines.map((line) => ({
          account_id: parseInt(line.account_id),
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
          vat_rate: parseFloat(line.vat_rate) || 0,
          vat_amount: parseFloat(line.vat_amount) || 0,
        })),
      });
      onSave();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction');
    }
  };

  const balance = calculateBalance();
  const isBalanced = Math.abs(balance.difference) < 0.01;

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <h4>New Transaction</h4>

      <div className="form-row">
        <div className="form-group">
          <label>Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Transaction description"
          />
        </div>
      </div>

      <div className="transaction-lines">
        <h5>Transaction Lines</h5>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>VAT Rate</th>
              <th>VAT Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td>
                  <select
                    value={line.account_id}
                    onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                    required
                  >
                    <option value="">Select account...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_number} - {account.account_name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.debit}
                    onChange={(e) => updateLine(index, 'debit', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.credit}
                    onChange={(e) => updateLine(index, 'credit', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <select
                    value={line.vat_rate}
                    onChange={(e) => updateLine(index, 'vat_rate', e.target.value)}
                  >
                    <option value="0">0%</option>
                    <option value="6">6%</option>
                    <option value="12">12%</option>
                    <option value="25">25%</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.vat_amount}
                    readOnly
                    placeholder="0.00"
                    className="vat-amount-readonly"
                  />
                </td>
                <td>
                  {lines.length > 2 && (
                    <button type="button" className="btn-small btn-danger" onClick={() => removeLine(index)}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td className="amount"><strong>{balance.totalDebit.toFixed(2)}</strong></td>
              <td className="amount"><strong>{balance.totalCredit.toFixed(2)}</strong></td>
              <td></td>
              <td className="amount">
                <strong>
                  {lines.reduce((sum, line) => sum + (parseFloat(line.vat_amount) || 0), 0).toFixed(2)}
                </strong>
              </td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={6} className={`balance-status ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                {isBalanced ? 'Balanced' : `Out of balance by ${Math.abs(balance.difference).toFixed(2)}`}
              </td>
            </tr>
          </tfoot>
        </table>
        <button type="button" className="btn-secondary" onClick={addLine}>
          Add Line
        </button>
      </div>

      <div className="button-group">
        <button type="submit" className="btn-primary" disabled={!isBalanced}>
          Save Transaction
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

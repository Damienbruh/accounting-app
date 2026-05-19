import React, { useState, useEffect } from 'react';
import { BankTransaction, UnreconciledTransaction } from '../electron';
import './BankReconciliation.css';

interface BankReconciliationProps {
  companyId: number;
}

interface MatchSuggestion {
  bankTransaction: BankTransaction;
  accountingTransaction: UnreconciledTransaction;
  score: number;
  reason: string;
}

const BankReconciliation: React.FC<BankReconciliationProps> = ({ companyId }) => {
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [unreconciledTransactions, setUnreconciledTransactions] = useState<UnreconciledTransaction[]>([]);
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [companyId, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load bank transactions
      const bankResult = await window.electronAPI?.getBankTransactions({
        companyId,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      if (bankResult?.success && bankResult.transactions) {
        setBankTransactions(bankResult.transactions);
      }

      // Load unreconciled accounting transactions
      const unreconciledResult = await window.electronAPI?.getUnreconciledTransactions({
        companyId,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      if (unreconciledResult?.success && unreconciledResult.transactions) {
        setUnreconciledTransactions(unreconciledResult.transactions);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await window.electronAPI?.importBankStatement({ companyId });
      
      if (result?.success) {
        setMessage({
          type: 'success',
          text: `Successfully imported ${result.imported} transactions from ${result.format} format`
        });
        loadData();
      } else {
        setMessage({ type: 'error', text: result?.error || 'Import failed' });
      }
    } catch (error) {
      console.error('Error importing:', error);
      setMessage({ type: 'error', text: 'Import failed' });
    } finally {
      setLoading(false);
    }
  };

  const selectBankTransaction = (tx: BankTransaction) => {
    setSelectedBankTx(tx);
    
    // Generate match suggestions
    const matches = findMatches(tx, unreconciledTransactions);
    setSuggestions(matches);
  };

  const findMatches = (bankTx: BankTransaction, accountingTxs: UnreconciledTransaction[]): MatchSuggestion[] => {
    const matches: MatchSuggestion[] = [];
    const bankDate = new Date(bankTx.transaction_date);
    const bankAmount = Math.abs(bankTx.amount);

    for (const accTx of accountingTxs) {
      const accDate = new Date(accTx.transaction_date);
      const daysDiff = Math.abs((bankDate.getTime() - accDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only consider transactions within 3 days
      if (daysDiff > 3) continue;

      // Get transaction amount (use credit for deposits, debit for withdrawals)
      const accAmount = bankTx.amount > 0 ? accTx.credit_total : accTx.debit_total;
      const amountDiff = Math.abs(bankAmount - accAmount);
      const amountDiffPercent = (amountDiff / bankAmount) * 100;

      let score = 0;
      let reason = '';

      // Exact amount match
      if (amountDiff < 0.01) {
        score += 50;
        reason = 'Exact amount match';
        
        // Same date
        if (daysDiff === 0) {
          score += 30;
          reason += ', same date';
        } else if (daysDiff === 1) {
          score += 20;
          reason += ', 1 day difference';
        } else {
          score += 10;
          reason += `, ${Math.floor(daysDiff)} days difference`;
        }

        // Description similarity (simple check)
        if (accTx.description && bankTx.description) {
          const bankDesc = bankTx.description.toLowerCase();
          const accDesc = accTx.description.toLowerCase();
          const words = bankDesc.split(/\s+/).filter(w => w.length > 3);
          
          for (const word of words) {
            if (accDesc.includes(word)) {
              score += 10;
              reason += ', similar description';
              break;
            }
          }
        }
      } else if (amountDiffPercent < 1) {
        // Very close amount (within 1%)
        score += 30;
        reason = `Close amount (${amountDiffPercent.toFixed(2)}% diff)`;
        
        if (daysDiff <= 1) {
          score += 15;
          reason += ', close date';
        }
      }

      if (score >= 40) {
        matches.push({
          bankTransaction: bankTx,
          accountingTransaction: accTx,
          score,
          reason
        });
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  };

  const handleMatch = async (accTx: UnreconciledTransaction) => {
    if (!selectedBankTx) return;

    setLoading(true);
    try {
      const result = await window.electronAPI?.matchTransaction({
        bankTransactionId: selectedBankTx.id,
        accountingTransactionId: accTx.id
      });

      if (result?.success) {
        setMessage({ type: 'success', text: 'Transactions matched successfully' });
        setSelectedBankTx(null);
        setSuggestions([]);
        loadData();
      } else {
        setMessage({ type: 'error', text: result?.error || 'Match failed' });
      }
    } catch (error) {
      console.error('Error matching:', error);
      setMessage({ type: 'error', text: 'Match failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async (bankTx: BankTransaction) => {
    if (!confirm('Are you sure you want to unmatch this transaction?')) return;

    setLoading(true);
    try {
      const result = await window.electronAPI?.unmatchTransaction({
        bankTransactionId: bankTx.id
      });

      if (result?.success) {
        setMessage({ type: 'success', text: 'Transaction unmatched successfully' });
        loadData();
      } else {
        setMessage({ type: 'error', text: result?.error || 'Unmatch failed' });
      }
    } catch (error) {
      console.error('Error unmatching:', error);
      setMessage({ type: 'error', text: 'Unmatch failed' });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount);
  };

  const unreconciledBankTxs = bankTransactions.filter(tx => tx.reconciled === 0);
  const reconciledBankTxs = bankTransactions.filter(tx => tx.reconciled === 1);

  return (
    <div className="bank-reconciliation">
      <div className="reconciliation-header">
        <h2>Bank Reconciliation</h2>
        <button onClick={handleImport} disabled={loading} className="import-button">
          Import Bank Statement
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="close-message">×</button>
        </div>
      )}

      <div className="date-filters">
        <label>
          Start Date:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button onClick={loadData} disabled={loading}>Refresh</button>
      </div>

      <div className="reconciliation-content">
        {/* Bank Transactions Panel */}
        <div className="bank-transactions-panel">
          <h3>Bank Transactions</h3>
          
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Unreconciled:</span>
              <span className="stat-value">{unreconciledBankTxs.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Reconciled:</span>
              <span className="stat-value">{reconciledBankTxs.length}</span>
            </div>
          </div>

          <div className="transaction-list">
            {unreconciledBankTxs.length === 0 && (
              <div className="empty-state">No unreconciled bank transactions</div>
            )}
            {unreconciledBankTxs.map(tx => (
              <div
                key={tx.id}
                className={`transaction-item ${selectedBankTx?.id === tx.id ? 'selected' : ''} ${tx.amount > 0 ? 'deposit' : 'withdrawal'}`}
                onClick={() => selectBankTransaction(tx)}
              >
                <div className="tx-date">{tx.transaction_date}</div>
                <div className="tx-description">{tx.description}</div>
                <div className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                  {formatAmount(tx.amount)}
                </div>
                {tx.balance && <div className="tx-balance">Balance: {formatAmount(tx.balance)}</div>}
              </div>
            ))}
          </div>

          {reconciledBankTxs.length > 0 && (
            <>
              <h4 className="reconciled-heading">Reconciled Transactions</h4>
              <div className="transaction-list reconciled-list">
                {reconciledBankTxs.map(tx => (
                  <div key={tx.id} className="transaction-item reconciled">
                    <div className="tx-date">{tx.transaction_date}</div>
                    <div className="tx-description">{tx.description}</div>
                    <div className="tx-amount">{formatAmount(tx.amount)}</div>
                    <div className="tx-matched">
                      Matched: {tx.matched_description}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmatch(tx);
                        }}
                        className="unmatch-button"
                      >
                        Unmatch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Matching Panel */}
        <div className="matching-panel">
          {selectedBankTx ? (
            <>
              <h3>Match Transaction</h3>
              <div className="selected-bank-tx">
                <div className="selected-label">Selected Bank Transaction:</div>
                <div className="selected-details">
                  <div>{selectedBankTx.transaction_date}</div>
                  <div>{selectedBankTx.description}</div>
                  <div className={`amount ${selectedBankTx.amount > 0 ? 'positive' : 'negative'}`}>
                    {formatAmount(selectedBankTx.amount)}
                  </div>
                </div>
              </div>

              {suggestions.length > 0 ? (
                <>
                  <h4>Suggested Matches</h4>
                  <div className="suggestions-list">
                    {suggestions.map((suggestion) => (
                      <div key={suggestion.accountingTransaction.id} className="suggestion-item">
                        <div className="suggestion-score">
                          Match Score: {suggestion.score}
                          <span className="suggestion-reason">{suggestion.reason}</span>
                        </div>
                        <div className="suggestion-details">
                          <div>{suggestion.accountingTransaction.transaction_date}</div>
                          <div>{suggestion.accountingTransaction.description}</div>
                          <div className="suggestion-amounts">
                            Debit: {formatAmount(suggestion.accountingTransaction.debit_total)} | 
                            Credit: {formatAmount(suggestion.accountingTransaction.credit_total)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleMatch(suggestion.accountingTransaction)}
                          className="match-button"
                          disabled={loading}
                        >
                          Match
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-suggestions">
                  No automatic matches found. Select from all unreconciled transactions below.
                </div>
              )}

              <h4>All Unreconciled Transactions</h4>
              <div className="unreconciled-list">
                {unreconciledTransactions.length === 0 && (
                  <div className="empty-state">No unreconciled accounting transactions</div>
                )}
                {unreconciledTransactions.map(tx => (
                  <div key={tx.id} className="unreconciled-item">
                    <div className="unreconciled-details">
                      <div>{tx.transaction_date}</div>
                      <div>{tx.description}</div>
                      <div className="unreconciled-amounts">
                        Debit: {formatAmount(tx.debit_total)} | Credit: {formatAmount(tx.credit_total)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMatch(tx)}
                      className="match-button"
                      disabled={loading}
                    >
                      Match
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              Select a bank transaction to find matching accounting transactions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankReconciliation;

import { useState } from 'react';
import './SIEImport.css';

interface SkippedTransaction {
  description: string;
  transaction_date: string;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  lines: Array<{ account_number: number; debit: number; credit: number }>;
}

interface SIEImportProps {
  companyId: number;
  companyName: string;
  onImportComplete?: () => void;
}

export default function SIEImport({ companyId, companyName, onImportComplete }: SIEImportProps) {
  const [importMode, setImportMode] = useState<'existing' | 'new'>('existing');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [skippedTransactions, setSkippedTransactions] = useState<SkippedTransaction[]>([]);

  const handleImport = async () => {
    if (!window.electronAPI) return;

    setImporting(true);
    setResult(null);

    try {
      const importResult = await window.electronAPI.importSIE({
        companyId: importMode === 'existing' ? companyId : undefined,
        createNewCompany: importMode === 'new'
      });

      if (importResult.success && importResult.summary) {
        const { accounts, transactions, companyName: importedCompanyName, sieType, hasBalances, skippedTransactions: skipped } = importResult.summary;
        const typeLabel = sieType ? ` (SIE Type ${sieType})` : '';
        const balancesNote = hasBalances ? ' Note: SIE 5 balance information was detected.' : '';
        const skippedNote = skipped && skipped.length > 0 ? ` Warning: ${skipped.length} unbalanced transactions were skipped.` : '';
        
        setResult({
          type: skipped && skipped.length > 0 ? 'error' : 'success',
          message: `Successfully imported ${transactions} transactions and ${accounts} new accounts from "${importedCompanyName}"${typeLabel}.${balancesNote}${skippedNote}`
        });
        
        if (skipped && skipped.length > 0) {
          setSkippedTransactions(skipped);
        } else {
          setSkippedTransactions([]);
        }
        
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        if (importResult.error !== 'Import canceled') {
          setResult({
            type: 'error',
            message: importResult.error || 'Import failed'
          });
        }
      }
    } catch (error) {
      console.error('Error importing SIE:', error);
      setResult({
        type: 'error',
        message: 'Failed to import SIE file'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="sie-import">
      <h3>SIE Import</h3>
      <p className="sie-description">
        Import accounting data from SIE Type 4 or Type 5 files exported from other Swedish accounting software.
      </p>

      <div className="sie-form">
        <div className="form-group">
          <label>Import Mode</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="existing"
                checked={importMode === 'existing'}
                onChange={(e) => setImportMode(e.target.value as 'existing')}
                disabled={importing}
              />
              <span>Import to this company ({companyName})</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="new"
                checked={importMode === 'new'}
                onChange={(e) => setImportMode(e.target.value as 'new')}
                disabled={importing}
              />
              <span>Create new company from SIE file</span>
            </label>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Select SIE File to Import'}
        </button>

        {result && (
          <div className={`import-result ${result.type}`}>
            {result.message}
          </div>
        )}
        
        {skippedTransactions.length > 0 && (
          <div className="skipped-transactions">
            <h4>Unbalanced Transactions</h4>
            <p className="warning-text">
              The following transactions were skipped because they are unbalanced. 
              You may need to manually add or fix these transactions:
            </p>
            <div className="skipped-list">
              {skippedTransactions.map((trans, index) => (
                <div key={index} className="skipped-item">
                  <div className="trans-header">
                    <strong>{trans.description || 'Untitled'}</strong>
                    <span className="trans-date">{trans.transaction_date}</span>
                  </div>
                  <div className="trans-balance">
                    <span>Debit: {trans.totalDebit.toFixed(2)} SEK</span>
                    <span>Credit: {trans.totalCredit.toFixed(2)} SEK</span>
                    <span className="difference">Difference: {trans.difference.toFixed(2)} SEK</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sie-info">
        <h4>Import Notes</h4>
        <ul>
          <li>Supports both SIE Type 4 (periodic transactions) and Type 5 (annual with balances)</li>
          <li>Accounts from the SIE file will be merged with existing accounts</li>
          <li>Duplicate transactions (same date and description) will be skipped</li>
          <li>The import process validates that all transactions are balanced</li>
          <li>Creating a new company will import all data into a separate company record</li>
        </ul>
      </div>
    </div>
  );
}

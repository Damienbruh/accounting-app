import React, { useState } from 'react';
import type { ExcelParseResult, ExcelColumnMapping, ExcelImportError } from '../electron';
import './ExcelImport.css';

interface ExcelImportProps {
  companyId: number;
  onImportComplete?: () => void;
}

type GroupingMode = 'single-row' | 'multi-row';

const ExcelImport: React.FC<ExcelImportProps> = ({ companyId, onImportComplete }) => {
  const [excelData, setExcelData] = useState<ExcelParseResult | null>(null);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('single-row');
  const [mapping, setMapping] = useState<ExcelColumnMapping>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importErrors, setImportErrors] = useState<ExcelImportError[]>([]);

  const handleLoadFile = async () => {
    setLoading(true);
    setMessage(null);
    setImportErrors([]);

    try {
      const result = await window.electronAPI?.readExcelFile();

      if (result?.success && result.headers && result.previewRows) {
        setExcelData(result);
        setMapping({}); // Reset mapping
        setMessage({
          type: 'info',
          text: `Loaded ${result.totalRows} rows from ${result.selectedSheet}. Please map the columns below.`
        });
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to read Excel file' });
      }
    } catch (error) {
      console.error('Error loading Excel file:', error);
      setMessage({ type: 'error', text: 'Failed to load Excel file' });
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: keyof ExcelColumnMapping, columnIndex: number | null) => {
    setMapping(prev => ({
      ...prev,
      [field]: columnIndex === null ? undefined : columnIndex
    }));
  };

  const isMappingValid = () => {
    if (groupingMode === 'single-row') {
      return mapping.date !== undefined &&
             mapping.debitAccount !== undefined &&
             mapping.creditAccount !== undefined &&
             mapping.amount !== undefined;
    } else {
      return mapping.date !== undefined &&
             mapping.account !== undefined &&
             (mapping.debit !== undefined || mapping.credit !== undefined);
    }
  };

  const handleImport = async () => {
    if (!excelData?.allRows || !isMappingValid()) {
      setMessage({ type: 'error', text: 'Please complete all required column mappings' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setImportErrors([]);

    try {
      const result = await window.electronAPI?.importExcelTransactions({
        companyId,
        rows: excelData.allRows,
        mapping,
        groupingMode
      });

      if (result?.success) {
        const errorCount = result.errors?.length || 0;
        setMessage({
          type: 'success',
          text: `Successfully imported ${result.imported} of ${result.totalProcessed} transactions${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
        });

        if (result.errors && result.errors.length > 0) {
          setImportErrors(result.errors);
        }

        if (onImportComplete) {
          onImportComplete();
        }

        // Clear the data after successful import
        setTimeout(() => {
          setExcelData(null);
          setMapping({});
        }, 3000);
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

  const renderColumnSelector = (field: keyof ExcelColumnMapping, label: string, required: boolean = false) => {
    const value = mapping[field];

    return (
      <div className="mapping-row">
        <label className="mapping-label">
          {label} {required && <span className="required">*</span>}
        </label>
        <select
          className="mapping-select"
          value={value ?? ''}
          onChange={(e) => handleMappingChange(field, e.target.value === '' ? null : parseInt(e.target.value))}
        >
          <option value="">-- Select Column --</option>
          {excelData?.headers?.map((header, index) => (
            <option key={index} value={index}>
              Column {index + 1}: {header || '(empty)'}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="excel-import">
      <div className="excel-import-header">
        <h3>Excel Import</h3>
        <button
          onClick={handleLoadFile}
          disabled={loading}
          className="load-button"
        >
          {excelData ? 'Load Different File' : 'Load Excel File'}
        </button>
      </div>

      {message && (
        <div className={`excel-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="close-message">×</button>
        </div>
      )}

      {excelData && (
        <>
          <div className="grouping-mode-selector">
            <label className="mode-label">Transaction Format:</label>
            <div className="mode-options">
              <label className="mode-option">
                <input
                  type="radio"
                  value="single-row"
                  checked={groupingMode === 'single-row'}
                  onChange={(e) => setGroupingMode(e.target.value as GroupingMode)}
                />
                <span>Single Row (One row per transaction with debit & credit accounts)</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  value="multi-row"
                  checked={groupingMode === 'multi-row'}
                  onChange={(e) => setGroupingMode(e.target.value as GroupingMode)}
                />
                <span>Multi Row (Multiple rows per transaction)</span>
              </label>
            </div>
          </div>

          <div className="column-mapping">
            <h4>Column Mapping</h4>
            <p className="mapping-description">
              Map your Excel columns to the required fields:
            </p>

            {groupingMode === 'single-row' ? (
              <>
                {renderColumnSelector('date', 'Transaction Date', true)}
                {renderColumnSelector('description', 'Description', false)}
                {renderColumnSelector('debitAccount', 'Debit Account Number', true)}
                {renderColumnSelector('creditAccount', 'Credit Account Number', true)}
                {renderColumnSelector('amount', 'Amount', true)}
              </>
            ) : (
              <>
                {renderColumnSelector('date', 'Transaction Date', true)}
                {renderColumnSelector('description', 'Description', false)}
                {renderColumnSelector('account', 'Account Number', true)}
                {renderColumnSelector('debit', 'Debit Amount', false)}
                {renderColumnSelector('credit', 'Credit Amount', false)}
                {renderColumnSelector('transactionId', 'Transaction ID (optional)', false)}
              </>
            )}
          </div>

          <div className="preview-section">
            <h4>Data Preview</h4>
            <p className="preview-description">
              Preview of first {excelData.previewRows?.length || 0} rows (Total: {excelData.totalRows} rows)
            </p>
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {excelData.headers?.map((header, index) => (
                      <th key={index}>
                        Col {index + 1}<br />
                        <span className="header-text">{header || '(empty)'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelData.previewRows?.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="row-number">{rowIndex + 1}</td>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>
                          {cell !== null && cell !== '' ? String(cell) : <span className="empty-cell">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="import-actions">
            <button
              onClick={handleImport}
              disabled={loading || !isMappingValid()}
              className="import-button"
            >
              {loading ? 'Importing...' : `Import ${excelData.totalRows} Rows`}
            </button>
            {!isMappingValid() && (
              <p className="validation-message">Please complete all required field mappings</p>
            )}
          </div>

          {importErrors.length > 0 && (
            <div className="import-errors">
              <h4>Import Errors ({importErrors.length})</h4>
              <div className="error-list">
                {importErrors.map((error, index) => (
                  <div key={index} className="error-item">
                    <strong>
                      {error.row && `Row ${error.row}: `}
                      {error.group && `Group ${error.group}: `}
                      {error.transaction && `${error.transaction}: `}
                    </strong>
                    {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!excelData && !loading && (
        <div className="empty-state">
          <p>Click "Load Excel File" to begin importing transactions from Excel.</p>
          <div className="instructions">
            <h4>Instructions:</h4>
            <ul>
              <li>Prepare your Excel file with transaction data</li>
              <li>Choose between single-row or multi-row format</li>
              <li>Map your Excel columns to the required fields</li>
              <li>Preview and verify your data</li>
              <li>Click Import to add transactions to your company</li>
            </ul>
            <h4>Requirements:</h4>
            <ul>
              <li>Account numbers must be valid BAS 2024 accounts (1000-9999)</li>
              <li>Dates can be in various formats (YYYY-MM-DD, DD/MM/YYYY, etc.)</li>
              <li>Amounts should be positive numbers</li>
              <li>For multi-row mode, transactions must balance (total debit = total credit)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImport;

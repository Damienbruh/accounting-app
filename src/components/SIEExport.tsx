import { useState, useEffect } from 'react';
import './SIEExport.css';

interface SIEExportProps {
  companyId: number;
  companyName: string;
}

export default function SIEExport({ companyId, companyName }: SIEExportProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Default to current fiscal year (Jan 1 - Dec 31)
    const now = new Date();
    const year = now.getFullYear();
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
  }, []);

  const handleExport = async () => {
    if (!window.electronAPI || !startDate || !endDate) return;

    setExporting(true);
    try {
      const result = await window.electronAPI.exportSIE({
        companyId,
        startDate,
        endDate
      });

      if (result.success) {
        alert(`SIE file exported successfully to:\n${result.filePath}`);
      } else {
        if (result.error !== 'Export canceled') {
          alert(`Export failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error exporting SIE:', error);
      alert('Failed to export SIE file');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="sie-export">
      <h3>SIE Export</h3>
      <p className="sie-description">
        Export accounting data in SIE Type 4 format for use with Swedish accounting software
        and submission to Skatteverket.
      </p>

      <div className="sie-form">
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={exporting}
            />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={exporting}
            />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={exporting || !startDate || !endDate}
        >
          {exporting ? 'Exporting...' : 'Export SIE File'}
        </button>
      </div>

      <div className="sie-info">
        <h4>About SIE Format</h4>
        <ul>
          <li>SIE (Standard Import Export) is the Swedish standard for exchanging accounting data</li>
          <li>Type 4 includes complete transaction data with verification numbers</li>
          <li>Compatible with most Swedish accounting software (Fortnox, Visma, etc.)</li>
          <li>The export includes your BAS 2024 chart of accounts and all transactions in the selected period</li>
        </ul>
      </div>
    </div>
  );
}

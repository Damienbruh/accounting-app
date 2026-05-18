import { useState, useEffect } from 'react';
import type { TransactionLine } from '../electron.d';
import './VATReport.css';

interface VATReportProps {
  companyId: number;
}

interface VATSummary {
  salesVAT: number;
  purchaseVAT: number;
  netVAT: number;
}

export default function VATReport({ companyId }: VATReportProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vatSummary, setVATSummary] = useState<VATSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!window.electronAPI || !startDate || !endDate) return;

    setLoading(true);
    try {
      const transactions = await window.electronAPI.getTransactions(companyId);
      
      const filteredTransactions = transactions.filter(t => {
        const transDate = new Date(t.transaction_date);
        return transDate >= new Date(startDate) && transDate <= new Date(endDate);
      });

      let salesVAT = 0;
      let purchaseVAT = 0;

      for (const transaction of filteredTransactions) {
        const lines = await window.electronAPI.getTransactionLines(transaction.id);
        
        for (const line of lines) {
          if (line.vat_amount > 0) {
            if (line.credit > 0) {
              salesVAT += line.vat_amount;
            } else if (line.debit > 0) {
              purchaseVAT += line.vat_amount;
            }
          }
        }
      }

      const netVAT = salesVAT - purchaseVAT;

      setVATSummary({
        salesVAT,
        purchaseVAT,
        netVAT
      });
    } catch (error) {
      console.error('Error generating VAT report:', error);
      alert('Failed to generate VAT report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="vat-report">
      <div className="report-header no-print">
        <h3>VAT Report (Momsrapport)</h3>
        <div className="date-range">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            className="btn-primary" 
            onClick={generateReport}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {vatSummary && (
        <div className="report-content">
          <div className="print-header">
            <h2>Momsrapport (VAT Report)</h2>
            <p>
              Period: {new Date(startDate).toLocaleDateString('sv-SE')} - {new Date(endDate).toLocaleDateString('sv-SE')}
            </p>
          </div>

          <div className="vat-summary">
            <table className="vat-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount (SEK)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Utgående moms (Sales VAT)</td>
                  <td className="amount positive">{vatSummary.salesVAT.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Ingående moms (Purchase VAT)</td>
                  <td className="amount">{vatSummary.purchaseVAT.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>Att betala/återfå (Net VAT Payable)</strong></td>
                  <td className={`amount ${vatSummary.netVAT >= 0 ? 'positive' : 'negative'}`}>
                    <strong>{vatSummary.netVAT.toFixed(2)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="vat-notes">
              <h4>Notes:</h4>
              <ul>
                <li>Positive amount means VAT payable to Skatteverket</li>
                <li>Negative amount means VAT refund from Skatteverket</li>
                <li>VAT on sales is collected on credit entries</li>
                <li>VAT on purchases is paid on debit entries</li>
              </ul>
            </div>
          </div>

          <div className="no-print">
            <button className="btn-primary" onClick={handlePrint}>
              Print Report
            </button>
          </div>
        </div>
      )}

      {!vatSummary && !loading && (
        <div className="report-placeholder">
          <p>Select a date range and click "Generate Report" to view VAT summary</p>
        </div>
      )}
    </div>
  );
}

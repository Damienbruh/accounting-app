import { useState, useEffect } from 'react';
import ProfitLossReport from './ProfitLossReport';
import BalanceSheetReport from './BalanceSheetReport';
import CashFlowReport from './CashFlowReport';
import './Reports.css';

interface ReportsProps {
  companyId: number;
  companyName: string;
}

type ReportType = 'profit-loss' | 'balance-sheet' | 'cash-flow';

export default function Reports({ companyId, companyName }: ReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('profit-loss');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    
    setStartDate(formatDate(yearStart));
    setEndDate(formatDate(today));
    setAsOfDate(formatDate(today));
  }, []);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleGenerateReport = () => {
    setShowReport(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="reports-container">
      <div className="reports-header no-print">
        <h2>Ekonomiska rapporter</h2>
        <p className="company-name">{companyName}</p>
      </div>

      <div className="report-controls no-print">
        <div className="control-group">
          <label>Rapporttyp</label>
          <select 
            value={reportType} 
            onChange={(e) => {
              setReportType(e.target.value as ReportType);
              setShowReport(false);
            }}
            className="report-select"
          >
            <option value="profit-loss">Resultaträkning (P&L)</option>
            <option value="balance-sheet">Balansräkning (Balance Sheet)</option>
            <option value="cash-flow">Kassaflödesanalys (Cash Flow)</option>
          </select>
        </div>

        {reportType !== 'balance-sheet' && (
          <>
            <div className="control-group">
              <label>Startdatum</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setShowReport(false);
                }}
              />
            </div>
            <div className="control-group">
              <label>Slutdatum</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setShowReport(false);
                }}
              />
            </div>
          </>
        )}

        {reportType === 'balance-sheet' && (
          <div className="control-group">
            <label>Per datum</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => {
                setAsOfDate(e.target.value);
                setShowReport(false);
              }}
            />
          </div>
        )}

        <button 
          className="btn-primary btn-generate" 
          onClick={handleGenerateReport}
          disabled={reportType !== 'balance-sheet' ? (!startDate || !endDate) : !asOfDate}
        >
          Generera rapport
        </button>

        {showReport && (
          <button className="btn-secondary btn-print" onClick={handlePrint}>
            Skriv ut
          </button>
        )}
      </div>

      {showReport && (
        <div className="report-content">
          {reportType === 'profit-loss' && (
            <ProfitLossReport
              companyId={companyId}
              companyName={companyName}
              startDate={startDate}
              endDate={endDate}
            />
          )}
          {reportType === 'balance-sheet' && (
            <BalanceSheetReport
              companyId={companyId}
              companyName={companyName}
              asOfDate={asOfDate}
            />
          )}
          {reportType === 'cash-flow' && (
            <CashFlowReport
              companyId={companyId}
              companyName={companyName}
              startDate={startDate}
              endDate={endDate}
            />
          )}
        </div>
      )}
    </div>
  );
}

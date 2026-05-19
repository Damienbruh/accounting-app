import { useState, useEffect } from 'react';

interface BalanceSheetReportProps {
  companyId: number;
  companyName: string;
  asOfDate: string;
}

export default function BalanceSheetReport({ companyId, companyName, asOfDate }: BalanceSheetReportProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [companyId, asOfDate]);

  const loadReport = async () => {
    if (!window.electronAPI) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.getBalanceSheet({ companyId, asOfDate });
      
      if (result.success && result.report) {
        setReportData(result.report);
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error loading balance sheet:', err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE');
  };

  if (loading) return <div className="report-loading">Laddar rapport...</div>;
  if (error) return <div className="report-error">Fel: {error}</div>;
  if (!reportData) return null;

  const { assets, liabilities, equity, summary } = reportData;

  return (
    <div className="financial-report balance-sheet-report">
      <div className="report-header">
        <h1>Balansräkning</h1>
        <h2>{companyName}</h2>
        <p className="report-period">Per {formatDate(asOfDate)}</p>
      </div>

      <div className="report-body balance-sheet-layout">
        <div className="balance-column">
          <section className="report-section">
            <h3>TILLGÅNGAR (Assets)</h3>
            <table className="report-table">
              <tbody>
                {assets.map((item: any) => (
                  <tr key={item.account_number}>
                    <td className="account-code">{item.account_number}</td>
                    <td className="account-name">{item.account_name}</td>
                    <td className="amount">{formatAmount(item.balance)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td colSpan={2}><strong>SUMMA TILLGÅNGAR</strong></td>
                  <td className="amount"><strong>{formatAmount(summary.totalAssets)}</strong></td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <div className="balance-column">
          <section className="report-section">
            <h3>EGET KAPITAL OCH SKULDER (Equity & Liabilities)</h3>
            
            <h4>Eget kapital (Equity)</h4>
            <table className="report-table">
              <tbody>
                {equity.map((item: any) => (
                  <tr key={item.account_number}>
                    <td className="account-code">{item.account_number}</td>
                    <td className="account-name">{item.account_name}</td>
                    <td className="amount">{formatAmount(item.balance)}</td>
                  </tr>
                ))}
                {summary.retainedEarnings !== 0 && (
                  <tr>
                    <td className="account-code">-</td>
                    <td className="account-name">Balanserat resultat</td>
                    <td className="amount">{formatAmount(summary.retainedEarnings)}</td>
                  </tr>
                )}
                <tr className="subtotal">
                  <td colSpan={2}>Summa eget kapital</td>
                  <td className="amount"><strong>{formatAmount(summary.totalEquity + summary.retainedEarnings)}</strong></td>
                </tr>
              </tbody>
            </table>

            <h4>Skulder (Liabilities)</h4>
            <table className="report-table">
              <tbody>
                {liabilities.map((item: any) => (
                  <tr key={item.account_number}>
                    <td className="account-code">{item.account_number}</td>
                    <td className="account-name">{item.account_name}</td>
                    <td className="amount">{formatAmount(item.balance)}</td>
                  </tr>
                ))}
                <tr className="subtotal">
                  <td colSpan={2}>Summa skulder</td>
                  <td className="amount"><strong>{formatAmount(summary.totalLiabilities)}</strong></td>
                </tr>
                <tr className="total">
                  <td colSpan={2}><strong>SUMMA EGET KAPITAL OCH SKULDER</strong></td>
                  <td className="amount"><strong>{formatAmount(summary.totalLiabilitiesAndEquity)}</strong></td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}

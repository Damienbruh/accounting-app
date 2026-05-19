import { useState, useEffect } from 'react';

interface CashFlowReportProps {
  companyId: number;
  companyName: string;
  startDate: string;
  endDate: string;
}

export default function CashFlowReport({ companyId, companyName, startDate, endDate }: CashFlowReportProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [companyId, startDate, endDate]);

  const loadReport = async () => {
    if (!window.electronAPI) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.getCashFlow({ companyId, startDate, endDate });
      
      if (result.success && result.report) {
        setReportData(result.report);
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error loading cash flow:', err);
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

  const { operating, investing, financing, summary } = reportData;

  return (
    <div className="financial-report cash-flow-report">
      <div className="report-header">
        <h1>Kassaflödesanalys</h1>
        <h2>{companyName}</h2>
        <p className="report-period">Period: {formatDate(startDate)} - {formatDate(endDate)}</p>
      </div>

      <div className="report-body">
        <section className="report-section">
          <h3>Den löpande verksamheten (Operating Activities)</h3>
          <table className="report-table">
            <tbody>
              {operating.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="account-code">{item.account_number || ''}</td>
                  <td className="account-name">{item.account_name}</td>
                  <td className="amount">{formatAmount(item.netChange || 0)}</td>
                </tr>
              ))}
              <tr className="subtotal">
                <td colSpan={2}><strong>Kassaflöde från den löpande verksamheten</strong></td>
                <td className="amount"><strong>{formatAmount(summary.cashFromOperating)}</strong></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <h3>Investeringsverksamheten (Investing Activities)</h3>
          <table className="report-table">
            <tbody>
              {investing.length > 0 ? (
                <>
                  {investing.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="account-code">{item.account_number}</td>
                      <td className="account-name">{item.account_name}</td>
                      <td className="amount">{formatAmount(item.netChange || 0)}</td>
                    </tr>
                  ))}
                  <tr className="subtotal">
                    <td colSpan={2}><strong>Kassaflöde från investeringsverksamheten</strong></td>
                    <td className="amount"><strong>{formatAmount(summary.cashFromInvesting)}</strong></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={3} className="no-data">Ingen investeringsaktivitet under perioden</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <h3>Finansieringsverksamheten (Financing Activities)</h3>
          <table className="report-table">
            <tbody>
              {financing.length > 0 ? (
                <>
                  {financing.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="account-code">{item.account_number}</td>
                      <td className="account-name">{item.account_name}</td>
                      <td className="amount">{formatAmount(item.netChange || 0)}</td>
                    </tr>
                  ))}
                  <tr className="subtotal">
                    <td colSpan={2}><strong>Kassaflöde från finansieringsverksamheten</strong></td>
                    <td className="amount"><strong>{formatAmount(summary.cashFromFinancing)}</strong></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={3} className="no-data">Ingen finansieringsaktivitet under perioden</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="report-total">
          <span>PERIODENS KASSAFLÖDE (Net Cash Flow)</span>
          <strong className={summary.netCashFlow >= 0 ? 'positive' : 'negative'}>
            {formatAmount(summary.netCashFlow)} SEK
          </strong>
        </div>
      </div>
    </div>
  );
}

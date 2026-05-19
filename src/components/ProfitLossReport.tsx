import { useState, useEffect } from 'react';

interface ProfitLossReportProps {
  companyId: number;
  companyName: string;
  startDate: string;
  endDate: string;
}

export default function ProfitLossReport({ companyId, companyName, startDate, endDate }: ProfitLossReportProps) {
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
      const result = await window.electronAPI.getProfitLoss({ companyId, startDate, endDate });
      
      if (result.success && result.report) {
        setReportData(result.report);
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error loading P&L report:', err);
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

  const { revenue, costOfSales, operatingExpenses, financialIncome, financialExpenses, summary } = reportData;

  return (
    <div className="financial-report profit-loss-report">
      <div className="report-header">
        <h1>Resultaträkning</h1>
        <h2>{companyName}</h2>
        <p className="report-period">Period: {formatDate(startDate)} - {formatDate(endDate)}</p>
      </div>

      <div className="report-body">
        <section className="report-section">
          <h3>Rörelseintäkter (Operating Income)</h3>
          <table className="report-table">
            <tbody>
              {revenue.map((item: any) => (
                <tr key={item.account_number}>
                  <td className="account-code">{item.account_number}</td>
                  <td className="account-name">{item.account_name}</td>
                  <td className="amount">{formatAmount(item.balance)}</td>
                </tr>
              ))}
              <tr className="subtotal">
                <td colSpan={2}>Nettoomsättning</td>
                <td className="amount"><strong>{formatAmount(summary.totalRevenue)}</strong></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <h3>Rörelsens kostnader (Operating Costs)</h3>
          <h4>Kostnad för sålda varor</h4>
          <table className="report-table">
            <tbody>
              {costOfSales.map((item: any) => (
                <tr key={item.account_number}>
                  <td className="account-code">{item.account_number}</td>
                  <td className="account-name">{item.account_name}</td>
                  <td className="amount">{formatAmount(Math.abs(item.balance))}</td>
                </tr>
              ))}
              <tr className="subtotal">
                <td colSpan={2}>Summa kostnad sålda varor</td>
                <td className="amount"><strong>{formatAmount(summary.totalCostOfSales)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div className="profit-line">
            <span>Bruttovinst (Gross Profit)</span>
            <strong>{formatAmount(summary.grossProfit)}</strong>
          </div>

          <h4>Övriga rörelsekostnader</h4>
          <table className="report-table">
            <tbody>
              {operatingExpenses.map((item: any) => (
                <tr key={item.account_number}>
                  <td className="account-code">{item.account_number}</td>
                  <td className="account-name">{item.account_name}</td>
                  <td className="amount">{formatAmount(Math.abs(item.balance))}</td>
                </tr>
              ))}
              <tr className="subtotal">
                <td colSpan={2}>Summa rörelsekostnader</td>
                <td className="amount"><strong>{formatAmount(summary.totalOperatingExpenses)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div className="profit-line">
            <span>Rörelseresultat (Operating Profit)</span>
            <strong>{formatAmount(summary.operatingProfit)}</strong>
          </div>
        </section>

        <section className="report-section">
          <h3>Finansiella poster (Financial Items)</h3>
          <table className="report-table">
            <tbody>
              {financialIncome.length > 0 && (
                <>
                  <tr className="category-header">
                    <td colSpan={3}>Finansiella intäkter</td>
                  </tr>
                  {financialIncome.map((item: any) => (
                    <tr key={item.account_number}>
                      <td className="account-code">{item.account_number}</td>
                      <td className="account-name">{item.account_name}</td>
                      <td className="amount">{formatAmount(item.balance)}</td>
                    </tr>
                  ))}
                </>
              )}
              {financialExpenses.length > 0 && (
                <>
                  <tr className="category-header">
                    <td colSpan={3}>Finansiella kostnader</td>
                  </tr>
                  {financialExpenses.map((item: any) => (
                    <tr key={item.account_number}>
                      <td className="account-code">{item.account_number}</td>
                      <td className="account-name">{item.account_name}</td>
                      <td className="amount">{formatAmount(Math.abs(item.balance))}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </section>

        <div className="report-total">
          <span>ÅRETS RESULTAT (Net Profit)</span>
          <strong className={summary.netProfit >= 0 ? 'positive' : 'negative'}>
            {formatAmount(summary.netProfit)} SEK
          </strong>
        </div>
      </div>
    </div>
  );
}

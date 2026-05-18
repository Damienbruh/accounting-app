import { useState, useEffect } from 'react';
import type { Account, TransactionLine } from '../electron.d';
import './Reports.css';

interface ReportsProps {
  companyId: number;
  companyName: string;
}

interface AccountBalance {
  account_number: number;
  account_name: string;
  account_type: string;
  balance: number;
}

export default function Reports({ companyId, companyName }: ReportsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Map<number, number>>(new Map());
  const [selectedReport, setSelectedReport] = useState<'balance' | 'income'>('balance');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAccounts();
    loadBalances();
  }, [companyId, reportDate]);

  const loadAccounts = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getAccounts(companyId);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadBalances = async () => {
    if (!window.electronAPI) return;
    try {
      const transactions = await window.electronAPI.getTransactions(companyId);
      const balanceMap = new Map<number, number>();

      // Filter transactions up to report date
      const filteredTransactions = transactions.filter(
        (t) => new Date(t.transaction_date) <= new Date(reportDate)
      );

      // Load transaction lines for each transaction
      for (const transaction of filteredTransactions) {
        const lines = await window.electronAPI.getTransactionLines(transaction.id);
        lines.forEach((line: TransactionLine) => {
          const currentBalance = balanceMap.get(line.account_id) || 0;
          // Debit increases assets/expenses, Credit increases liabilities/equity/income
          balanceMap.set(line.account_id, currentBalance + line.debit - line.credit);
        });
      }

      setBalances(balanceMap);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const getAccountBalance = (accountId: number): number => {
    return balances.get(accountId) || 0;
  };

  const getAccountBalances = (): AccountBalance[] => {
    return accounts.map((account) => ({
      account_number: account.account_number,
      account_name: account.account_name,
      account_type: account.account_type,
      balance: getAccountBalance(account.id),
    }));
  };

  const generateBalanceSheet = () => {
    const accountBalances = getAccountBalances();

    // Assets (Tillgångar) - accounts 1xxx
    const assets = accountBalances.filter((acc) => acc.account_number >= 1000 && acc.account_number < 2000);
    const fixedAssets = assets.filter((acc) => acc.account_number < 1300);
    const currentAssets = assets.filter((acc) => acc.account_number >= 1300);

    // Equity and Liabilities (Eget kapital och skulder) - accounts 2xxx
    const equityAndLiabilities = accountBalances.filter((acc) => acc.account_number >= 2000 && acc.account_number < 3000);
    const equity = equityAndLiabilities.filter((acc) => acc.account_number < 2100);
    const liabilities = equityAndLiabilities.filter((acc) => acc.account_number >= 2100);

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquityAndLiabilities = equityAndLiabilities.reduce((sum, acc) => sum + acc.balance, 0);

    return {
      fixedAssets,
      currentAssets,
      equity,
      liabilities,
      totalAssets,
      totalEquityAndLiabilities,
    };
  };

  const generateIncomeStatement = () => {
    const accountBalances = getAccountBalances();

    // Income (Intäkter) - accounts 3xxx
    const income = accountBalances.filter((acc) => acc.account_number >= 3000 && acc.account_number < 4000);

    // Expenses (Kostnader) - accounts 4xxx-8xxx
    const expenses = accountBalances.filter((acc) => acc.account_number >= 4000 && acc.account_number < 9000);

    // Group expenses
    const costOfGoodsSold = expenses.filter((acc) => acc.account_number >= 4000 && acc.account_number < 5000);
    const operatingExpenses = expenses.filter((acc) => acc.account_number >= 5000 && acc.account_number < 8000);
    const financialItems = expenses.filter((acc) => acc.account_number >= 8000 && acc.account_number < 8800);
    const taxes = expenses.filter((acc) => acc.account_number >= 8800 && acc.account_number < 9000);

    const totalIncome = income.reduce((sum, acc) => sum - acc.balance, 0); // Credit balance = positive income
    const totalCostOfGoodsSold = costOfGoodsSold.reduce((sum, acc) => sum + acc.balance, 0);
    const totalOperatingExpenses = operatingExpenses.reduce((sum, acc) => sum + acc.balance, 0);
    const totalFinancialItems = financialItems.reduce((sum, acc) => sum + acc.balance, 0);
    const totalTaxes = taxes.reduce((sum, acc) => sum + acc.balance, 0);

    const grossProfit = totalIncome - totalCostOfGoodsSold;
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const profitBeforeTax = operatingProfit - totalFinancialItems;
    const netProfit = profitBeforeTax - totalTaxes;

    return {
      income,
      costOfGoodsSold,
      operatingExpenses,
      financialItems,
      taxes,
      totalIncome,
      totalCostOfGoodsSold,
      totalOperatingExpenses,
      totalFinancialItems,
      totalTaxes,
      grossProfit,
      operatingProfit,
      profitBeforeTax,
      netProfit,
    };
  };

  const balanceSheet = generateBalanceSheet();
  const incomeStatement = generateIncomeStatement();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="reports">
      <div className="reports-header">
        <h3>Reports</h3>
        <div className="report-controls">
          <div className="report-selector">
            <button
              className={`btn-tab ${selectedReport === 'balance' ? 'active' : ''}`}
              onClick={() => setSelectedReport('balance')}
            >
              Balance Sheet
            </button>
            <button
              className={`btn-tab ${selectedReport === 'income' ? 'active' : ''}`}
              onClick={() => setSelectedReport('income')}
            >
              Income Statement
            </button>
          </div>
          <div className="report-date">
            <label>Report Date:</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handlePrint}>
            Print Report
          </button>
        </div>
      </div>

      <div className="report-content">
        {selectedReport === 'balance' ? (
          <div className="balance-sheet">
            <div className="report-title">
              <h2>Balansrapport (Balance Sheet)</h2>
              <p className="company-name">{companyName}</p>
              <p className="report-date-display">Per {new Date(reportDate).toLocaleDateString('sv-SE')}</p>
            </div>

            <div className="report-columns">
              <div className="report-column">
                <h3>TILLGÅNGAR (ASSETS)</h3>

                <div className="report-section">
                  <h4>Anläggningstillgångar (Fixed Assets)</h4>
                  <table className="report-table">
                    <tbody>
                      {balanceSheet.fixedAssets
                        .filter((acc) => Math.abs(acc.balance) > 0.01)
                        .map((acc) => (
                          <tr key={acc.account_number}>
                            <td className="account-number">{acc.account_number}</td>
                            <td className="account-name">{acc.account_name}</td>
                            <td className="amount">{formatAmount(acc.balance)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-section">
                  <h4>Omsättningstillgångar (Current Assets)</h4>
                  <table className="report-table">
                    <tbody>
                      {balanceSheet.currentAssets
                        .filter((acc) => Math.abs(acc.balance) > 0.01)
                        .map((acc) => (
                          <tr key={acc.account_number}>
                            <td className="account-number">{acc.account_number}</td>
                            <td className="account-name">{acc.account_name}</td>
                            <td className="amount">{formatAmount(acc.balance)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-total">
                  <strong>SUMMA TILLGÅNGAR</strong>
                  <strong>{formatAmount(balanceSheet.totalAssets)}</strong>
                </div>
              </div>

              <div className="report-column">
                <h3>EGET KAPITAL OCH SKULDER (EQUITY & LIABILITIES)</h3>

                <div className="report-section">
                  <h4>Eget kapital (Equity)</h4>
                  <table className="report-table">
                    <tbody>
                      {balanceSheet.equity
                        .filter((acc) => Math.abs(acc.balance) > 0.01)
                        .map((acc) => (
                          <tr key={acc.account_number}>
                            <td className="account-number">{acc.account_number}</td>
                            <td className="account-name">{acc.account_name}</td>
                            <td className="amount">{formatAmount(-acc.balance)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-section">
                  <h4>Skulder (Liabilities)</h4>
                  <table className="report-table">
                    <tbody>
                      {balanceSheet.liabilities
                        .filter((acc) => Math.abs(acc.balance) > 0.01)
                        .map((acc) => (
                          <tr key={acc.account_number}>
                            <td className="account-number">{acc.account_number}</td>
                            <td className="account-name">{acc.account_name}</td>
                            <td className="amount">{formatAmount(-acc.balance)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-total">
                  <strong>SUMMA EGET KAPITAL OCH SKULDER</strong>
                  <strong>{formatAmount(-balanceSheet.totalEquityAndLiabilities)}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="income-statement">
            <div className="report-title">
              <h2>Resultatrapport (Income Statement)</h2>
              <p className="company-name">{companyName}</p>
              <p className="report-date-display">Period: t.o.m. {new Date(reportDate).toLocaleDateString('sv-SE')}</p>
            </div>

            <div className="report-section">
              <h4>Rörelseintäkter (Operating Income)</h4>
              <table className="report-table">
                <tbody>
                  {incomeStatement.income
                    .filter((acc) => Math.abs(acc.balance) > 0.01)
                    .map((acc) => (
                      <tr key={acc.account_number}>
                        <td className="account-number">{acc.account_number}</td>
                        <td className="account-name">{acc.account_name}</td>
                        <td className="amount">{formatAmount(-acc.balance)}</td>
                      </tr>
                    ))}
                  <tr className="subtotal">
                    <td colSpan={2}>Nettoomsättning (Net Sales)</td>
                    <td className="amount"><strong>{formatAmount(incomeStatement.totalIncome)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="report-section">
              <h4>Rörelsekostnader (Operating Expenses)</h4>
              <table className="report-table">
                <tbody>
                  <tr className="category-header">
                    <td colSpan={3}>Kostnader för sålda varor (Cost of Goods Sold)</td>
                  </tr>
                  {incomeStatement.costOfGoodsSold
                    .filter((acc) => Math.abs(acc.balance) > 0.01)
                    .map((acc) => (
                      <tr key={acc.account_number}>
                        <td className="account-number">{acc.account_number}</td>
                        <td className="account-name">{acc.account_name}</td>
                        <td className="amount">{formatAmount(acc.balance)}</td>
                      </tr>
                    ))}
                  <tr className="subtotal">
                    <td colSpan={2}>Bruttovinst (Gross Profit)</td>
                    <td className="amount"><strong>{formatAmount(incomeStatement.grossProfit)}</strong></td>
                  </tr>
                  <tr className="spacer"><td colSpan={3}></td></tr>
                  <tr className="category-header">
                    <td colSpan={3}>Övriga rörelsekostnader (Other Operating Expenses)</td>
                  </tr>
                  {incomeStatement.operatingExpenses
                    .filter((acc) => Math.abs(acc.balance) > 0.01)
                    .map((acc) => (
                      <tr key={acc.account_number}>
                        <td className="account-number">{acc.account_number}</td>
                        <td className="account-name">{acc.account_name}</td>
                        <td className="amount">{formatAmount(acc.balance)}</td>
                      </tr>
                    ))}
                  <tr className="subtotal">
                    <td colSpan={2}>Rörelseresultat (Operating Profit)</td>
                    <td className="amount"><strong>{formatAmount(incomeStatement.operatingProfit)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="report-section">
              <h4>Finansiella poster (Financial Items)</h4>
              <table className="report-table">
                <tbody>
                  {incomeStatement.financialItems
                    .filter((acc) => Math.abs(acc.balance) > 0.01)
                    .map((acc) => (
                      <tr key={acc.account_number}>
                        <td className="account-number">{acc.account_number}</td>
                        <td className="account-name">{acc.account_name}</td>
                        <td className="amount">{formatAmount(acc.balance)}</td>
                      </tr>
                    ))}
                  <tr className="subtotal">
                    <td colSpan={2}>Resultat före skatt (Profit Before Tax)</td>
                    <td className="amount"><strong>{formatAmount(incomeStatement.profitBeforeTax)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="report-section">
              <h4>Skatter (Taxes)</h4>
              <table className="report-table">
                <tbody>
                  {incomeStatement.taxes
                    .filter((acc) => Math.abs(acc.balance) > 0.01)
                    .map((acc) => (
                      <tr key={acc.account_number}>
                        <td className="account-number">{acc.account_number}</td>
                        <td className="account-name">{acc.account_name}</td>
                        <td className="amount">{formatAmount(acc.balance)}</td>
                      </tr>
                    ))}
                  <tr className="total">
                    <td colSpan={2}><strong>ÅRETS RESULTAT (NET PROFIT)</strong></td>
                    <td className="amount"><strong>{formatAmount(incomeStatement.netProfit)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

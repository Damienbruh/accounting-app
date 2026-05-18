import { useState, useEffect } from 'react';
import './App.css';
import type { Company } from './electron.d';
import CompanyDetail from './components/CompanyDetail';
import CompanyForm from './components/CompanyForm';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isElectron, setIsElectron] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const electronAvailable = typeof window.electronAPI !== 'undefined';
    setIsElectron(electronAvailable);
    console.log('Running in Electron:', electronAvailable);

    if (electronAvailable) {
      loadCompanies();
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await window.electronAPI?.getCompanies();
      console.log('Companies loaded:', data);
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSaveCompany = async (data: { name: string; org_number?: string }) => {
    if (!window.electronAPI) {
      alert('This feature is only available in the desktop app');
      return;
    }

    try {
      await window.electronAPI.addCompany(data);
      await loadCompanies();
      setShowCompanyForm(false);
    } catch (error) {
      console.error('Error adding company:', error);
      alert('Failed to add company');
    }
  };

  const handleImportSIE = async () => {
    if (!window.electronAPI) {
      alert('This feature is only available in the desktop app');
      return;
    }

    try {
      const result = await window.electronAPI.importSIE({
        createNewCompany: true
      });

      if (result.success && result.summary) {
        const { accounts, transactions, companyName, sieType } = result.summary;
        const typeLabel = sieType ? ` (SIE Type ${sieType})` : '';
        alert(`Successfully imported company "${companyName}"${typeLabel}\n\n${transactions} transactions and ${accounts} new accounts imported.`);
        await loadCompanies();
      } else if (result.error && result.error !== 'Import canceled') {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing SIE:', error);
      alert('Failed to import SIE file');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Accounting Software</h1>
        <nav>
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'companies' ? 'active' : ''}
            onClick={() => setActiveTab('companies')}
          >
            Companies
          </button>
          <button
            className={activeTab === 'transactions' ? 'active' : ''}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={activeTab === 'reports' ? 'active' : ''}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div className="content">
            <h2>Dashboard</h2>
            <p>Welcome to your accounting software!</p>
            <div className="stats">
              <div className="stat-card">
                <h3>Companies</h3>
                <p className="stat-number">{companies.length}</p>
              </div>
              <div className="stat-card">
                <h3>Transactions</h3>
                <p className="stat-number">0</p>
              </div>
              <div className="stat-card">
                <h3>This Month</h3>
                <p className="stat-number">0 kr</p>
              </div>
            </div>
            {!isElectron && (
              <p style={{ marginTop: '1rem', color: '#e74c3c' }}>
                Running in browser mode. Open the desktop app for full functionality.
              </p>
            )}
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="content">
            <h2>Companies</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
              <button className="btn-primary" onClick={() => setShowCompanyForm(true)}>
                Add Company
              </button>
              <button className="btn-import" onClick={handleImportSIE}>
                Import from SIE File
              </button>
            </div>
            {companies.length === 0 ? (
              <p>No companies yet. Add your first company to get started.</p>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {companies.map((company) => (
                  <div 
                    key={company.id} 
                    className="stat-card company-card" 
                    style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <h3>{company.name}</h3>
                    {company.org_number && <p>Org. nr: {company.org_number}</p>}
                    <p style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                      Created: {new Date(company.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="content">
            <h2>Transactions</h2>
            <button className="btn-primary">New Transaction</button>
            <p>No transactions yet.</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="content">
            <h2>Reports</h2>
            <p>Financial reports will be available here.</p>
          </div>
        )}
      </main>

      {selectedCompany && (
        <CompanyDetail
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdate={async () => {
            await loadCompanies();
            // Update the selected company with fresh data
            const updated = companies.find(c => c.id === selectedCompany.id);
            if (updated) {
              setSelectedCompany(updated);
            }
          }}
        />
      )}

      {showCompanyForm && (
        <CompanyForm
          onSave={handleSaveCompany}
          onCancel={() => setShowCompanyForm(false)}
        />
      )}
    </div>
  );
}

export default App;

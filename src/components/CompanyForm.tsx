import { useState } from 'react';
import type { Company } from '../electron.d';
import './CompanyForm.css';

interface CompanyFormProps {
  company?: Company | null;
  onSave: (data: { name: string; org_number?: string }) => void;
  onCancel: () => void;
}

export default function CompanyForm({ company, onSave, onCancel }: CompanyFormProps) {
  const [name, setName] = useState(company?.name || '');
  const [orgNumber, setOrgNumber] = useState(company?.org_number || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      org_number: orgNumber || undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{company ? 'Edit Company' : 'Add Company'}</h2>
          <button className="btn-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="company-name">Company Name *</label>
            <input
              id="company-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="org-number">Organization Number</label>
            <input
              id="org-number"
              type="text"
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value)}
              placeholder="XXXXXXXXXX (10 digits)"
              maxLength={10}
            />
            <small>Optional - 10 digit Swedish organization number</small>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">
              {company ? 'Save Changes' : 'Add Company'}
            </button>
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

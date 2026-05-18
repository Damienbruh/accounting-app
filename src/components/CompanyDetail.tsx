import { useState, useEffect } from 'react';
import type { Company, Employee, Document } from '../electron.d';
import TransactionManager from './TransactionManager';
import Reports from './Reports';
import './CompanyDetail.css';

interface CompanyDetailProps {
  company: Company;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CompanyDetail({ company, onClose, onUpdate }: CompanyDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCompany, setEditedCompany] = useState({ ...company });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadEmployees();
    loadDocuments();
  }, [company.id]);

  const loadEmployees = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getEmployees(company.id);
      setEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadDocuments = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getDocuments(company.id);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleUploadDocument = async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.uploadDocument({
        company_id: company.id,
      });
      if (result) {
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    }
  };

  const handleViewDocument = async (documentId: number) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.viewDocument(documentId);
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document');
    }
  };

  const handleDownloadDocument = async (documentId: number) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.downloadDocument(documentId);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!window.electronAPI) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await window.electronAPI.deleteDocument(documentId);
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleSaveCompany = async () => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI.updateCompany(editedCompany);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company');
    }
  };

  const handleDeleteCompany = async () => {
    if (!window.electronAPI) return;
    if (!confirm(`Are you sure you want to delete ${company.name}? This will also delete all employees.`)) return;

    try {
      await window.electronAPI.deleteCompany(company.id);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company');
    }
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    if (!window.electronAPI) return;
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await window.electronAPI.deleteEmployee(employeeId);
      await loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  return (
    <div className="company-detail">
      <div className="company-detail-header">
        <h2>Company Details</h2>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="company-info">
        {isEditing ? (
          <div className="edit-form">
            <div className="form-group">
              <label>Company Name:</label>
              <input
                type="text"
                value={editedCompany.name}
                onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Organization Number:</label>
              <input
                type="text"
                value={editedCompany.org_number || ''}
                onChange={(e) => setEditedCompany({ ...editedCompany, org_number: e.target.value })}
              />
            </div>
            <div className="button-group">
              <button className="btn-primary" onClick={handleSaveCompany}>Save</button>
              <button className="btn-secondary" onClick={() => {
                setEditedCompany({ ...company });
                setIsEditing(false);
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="company-view">
            <div className="info-row">
              <strong>Name:</strong> {company.name}
            </div>
            <div className="info-row">
              <strong>Org. Number:</strong> {company.org_number || 'N/A'}
            </div>
            <div className="info-row">
              <strong>Created:</strong> {new Date(company.created_at).toLocaleDateString()}
            </div>
            <div className="button-group">
              <button className="btn-primary" onClick={() => setIsEditing(true)}>Edit</button>
              <button className="btn-danger" onClick={handleDeleteCompany}>Delete Company</button>
            </div>
          </div>
        )}
      </div>

      <div className="employees-section">
        <div className="employees-header">
          <h3>Employees ({employees.length})</h3>
          <button className="btn-primary" onClick={() => {
            setEditingEmployee(null);
            setShowEmployeeForm(true);
          }}>Add Employee</button>
        </div>

        {showEmployeeForm && (
          <EmployeeForm
            companyId={company.id}
            employee={editingEmployee}
            onSave={async () => {
              setShowEmployeeForm(false);
              setEditingEmployee(null);
              await loadEmployees();
            }}
            onCancel={() => {
              setShowEmployeeForm(false);
              setEditingEmployee(null);
            }}
          />
        )}

        <div className="employees-list">
          {employees.length === 0 ? (
            <p>No employees yet.</p>
          ) : (
            employees.map((employee) => (
              <div key={employee.id} className="employee-card">
                <div className="employee-info">
                  <h4>{employee.first_name} {employee.last_name}</h4>
                  {employee.position && <p className="employee-position">{employee.position}</p>}
                  {employee.email && <p>{employee.email}</p>}
                  {employee.phone && <p>{employee.phone}</p>}
                  {employee.personal_number && <p>Personal number: {employee.personal_number}</p>}
                  {employee.salary && <p>Salary: {employee.salary} SEK</p>}
                  {employee.employment_date && (
                    <p>Employment date: {new Date(employee.employment_date).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="employee-actions">
                  <button 
                    className="btn-small"
                    onClick={() => {
                      setEditingEmployee(employee);
                      setShowEmployeeForm(true);
                    }}
                  >Edit</button>
                  <button 
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteEmployee(employee.id)}
                  >Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="employees-section">
        <div className="employees-header">
          <h3>Documents ({documents.length})</h3>
          <button className="btn-primary" onClick={handleUploadDocument}>
            Upload Document
          </button>
        </div>

        <div className="employees-list">
          {documents.length === 0 ? (
            <p>No documents yet. Upload invoices, receipts, or other accounting documents.</p>
          ) : (
            documents.map((document) => (
              <div key={document.id} className="employee-card">
                <div className="employee-info">
                  <h4>{document.file_name}</h4>
                  <p>Type: {document.file_type || 'Unknown'}</p>
                  <p>Size: {(document.file_size / 1024).toFixed(2)} KB</p>
                  {document.description && <p>Description: {document.description}</p>}
                  {document.category && <p>Category: {document.category}</p>}
                  <p style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                    Uploaded: {new Date(document.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="employee-actions">
                  <button 
                    className="btn-small"
                    onClick={() => handleViewDocument(document.id)}
                  >View</button>
                  <button 
                    className="btn-small"
                    onClick={() => handleDownloadDocument(document.id)}
                  >Download</button>
                  <button 
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteDocument(document.id)}
                  >Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="employees-section">
        <TransactionManager companyId={company.id} />
      </div>

      <div className="employees-section">
        <Reports companyId={company.id} companyName={company.name} />
      </div>
    </div>
  );
}

interface EmployeeFormProps {
  companyId: number;
  employee: Employee | null;
  onSave: () => void;
  onCancel: () => void;
}

function EmployeeForm({ companyId, employee, onSave, onCancel }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    personal_number: employee?.personal_number || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || '',
    salary: employee?.salary || '',
    employment_date: employee?.employment_date || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;

    try {
      if (employee) {
        await window.electronAPI.updateEmployee({
          id: employee.id,
          company_id: companyId,
          ...formData,
          salary: formData.salary ? Number(formData.salary) : undefined,
        });
      } else {
        await window.electronAPI.addEmployee({
          company_id: companyId,
          ...formData,
          salary: formData.salary ? Number(formData.salary) : undefined,
        });
      }
      onSave();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee');
    }
  };

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h4>{employee ? 'Edit Employee' : 'Add Employee'}</h4>
      
      <div className="form-row">
        <div className="form-group">
          <label>First Name *</label>
          <input
            type="text"
            required
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Last Name *</label>
          <input
            type="text"
            required
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Personal Number (YYYYMMDD-XXXX)</label>
          <input
            type="text"
            value={formData.personal_number}
            onChange={(e) => setFormData({ ...formData, personal_number: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Position</label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Salary (SEK/month)</label>
          <input
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Employment Date</label>
          <input
            type="date"
            value={formData.employment_date}
            onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })}
          />
        </div>
      </div>

      <div className="button-group">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

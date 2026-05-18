# Feature Requirements for Swedish Accounting Software

## Core Requirements (Swedish Compliance)

### 1. Bokforingslagen (BFL) Compliance
- **Requirement**: All accounting must follow Swedish accounting law
- **Key points**:
  - Chronological transaction recording
  - Complete audit trail (verifikationskedja)
  - 7-year retention requirement
  - No deletion of transactions (only corrections via new entries)
  - Balanced books (debit = credit)

### 2. Chart of Accounts (Kontoplan)
- **BAS 2024 Standard** (most common in Sweden)
  - Account ranges:
    - 1000-1999: Assets (Tillgangar)
    - 2000-2999: Liabilities & Equity (Skulder och eget kapital)
    - 3000-3999: Revenue (Intakter)
    - 4000-7999: Expenses (Kostnader)
    - 8000-8999: Financial items (Finansiella poster)
- **Features needed**:
  - Pre-loaded BAS 2024 accounts
  - Ability to add custom accounts
  - Account number validation
  - Account types (Asset, Liability, Revenue, Expense)
  - Active/inactive accounts
  - Per-company account customization

### 3. VAT (Moms) Handling
- **Swedish VAT rates**:
  - 25% (standard rate)
  - 12% (food, restaurants, hotel)
  - 6% (newspapers, books, passenger transport)
  - 0% (exports, certain services)
- **Features needed**:
  - Automatic VAT calculation
  - VAT codes per transaction line
  - Momskoder (VAT codes): MA, MB, MC, MD, etc.
  - VAT report generation (monthly/quarterly)
  - Reverse VAT for foreign purchases
  - Export to Skatteverket format

## Essential Features

### 4. Company Management
- [x] Add/edit/delete companies
- [ ] Company details:
  - Organization number (10 digits)
  - Name
  - Address
  - Contact information
  - Fiscal year settings
  - VAT registration number
  - Default kontoplan
- [ ] Switch between companies quickly
- [ ] Company-specific settings

### 5. Verifikationer (Vouchers/Transactions)
- [ ] Create transaction entry form
- [ ] Required fields:
  - Verification number (auto-increment per company)
  - Date
  - Description
  - Multiple lines (debit/credit)
  - Attachment reference
- [ ] Validation:
  - Debit must equal credit
  - Valid account numbers
  - Valid dates within fiscal year
- [ ] Transaction types:
  - Manual entries
  - Bank transactions
  - Supplier invoices
  - Customer invoices
- [ ] Attachment handling (PDF/image scanning)
- [ ] Transaction search and filtering

### 6. Double-Entry Bookkeeping
- [ ] Every transaction must have balanced debit/credit
- [ ] Support for compound entries (multiple lines)
- [ ] Automatic account suggestions based on patterns
- [ ] Copy previous transactions
- [ ] Transaction templates for recurring entries

### 7. Bank Reconciliation (Bankavstamning)
- [ ] Import bank statements (CSV/Excel)
  - Common Swedish banks: SEB, Nordea, Handelsbanken, Swedbank
- [ ] Match transactions to verifikationer
- [ ] Mark as reconciled
- [ ] Show unreconciled items
- [ ] Bank balance vs book balance comparison

### 8. Reports (Rapporter)

#### Required Reports:
- [ ] **Kontoplan** (Chart of Accounts)
- [ ] **Verifikationslista** (Transaction journal)
- [ ] **Huvudbok** (General ledger per account)
- [ ] **Balansrapport** (Balance sheet)
  - Assets, Liabilities, Equity
  - Per specific date
- [ ] **Resultatrapport** (Income statement)
  - Revenue, Expenses, Net income
  - Per period (month/quarter/year)
- [ ] **Arsredovisning** (Annual report basics)
- [ ] **Momsrapport** (VAT report)
  - Box 05: Outgoing VAT
  - Box 10: Incoming VAT
  - Box 30: VAT to pay/receive
- [ ] **SRU/SIE export** (Standard formats for Skatteverket)

### 9. Period Management
- [ ] Fiscal year definition (often July-June or Jan-Dec)
- [ ] Period closing (month/quarter/year-end)
- [ ] Lock periods after closing
- [ ] Opening balances from previous year
- [ ] Year-end adjustments
- [ ] Depreciation calculations

### 10. Customer/Supplier Management (Optional but useful)
- [ ] Customer register
  - Name, org number, address
  - Payment terms
  - Outstanding invoices
- [ ] Supplier register
  - Same as customer
  - Payment tracking
- [ ] Accounts receivable aging report
- [ ] Accounts payable aging report

## Swedish-Specific Features

### 11. K-Regelverken (Accounting Standards)
- [ ] Support for K1, K2, K3 reporting standards
- [ ] Report templates per standard
- [ ] Depreciation rules per standard

### 12. Integration with Skatteverket
- [ ] Export to SRU format (tax declaration)
- [ ] SIE file export (Standard Import Export)
  - SIE Type 1: Year-end balances
  - SIE Type 4: Transactions and balances
- [ ] Inkomstdeklaration preparation data

### 13. Salary Integration (Basic)
- [ ] Record salary payments
- [ ] Employer contributions (arbetsgivaravgifter)
  - 31.42% standard rate
- [ ] Preliminary tax (skatteavdrag)
- [ ] Holiday pay provisions

### 14. Multi-Company Features (Key for your use case)
- [ ] Quick company switcher
- [ ] Dashboard showing all companies overview
- [ ] Consolidated reports across companies
- [ ] Per-company data isolation
- [ ] Bulk operations (e.g., period closing all companies)
- [ ] Company comparison reports

## User Experience Features

### 15. Workflow Optimization
- [ ] Keyboard shortcuts for common actions
- [ ] Transaction entry speed optimizations
- [ ] Recent accounts quick access
- [ ] Favorite/pinned accounts
- [ ] Transaction templates
- [ ] Batch entry mode

### 16. Search and Navigation
- [ ] Global search (transactions, accounts, companies)
- [ ] Quick filters (date ranges, accounts, amounts)
- [ ] Saved filter presets
- [ ] Transaction history per account

### 17. Data Management
- [ ] Backup functionality
  - Manual backup
  - Automatic backups
  - Backup to external location
- [ ] Restore from backup
- [ ] Export data (Excel, CSV, PDF)
- [ ] Import transactions from spreadsheets
- [ ] Audit log (who changed what, when)

### 18. User Settings
- [ ] Multiple user accounts (if needed)
- [ ] Role-based permissions
- [ ] Default settings per user
- [ ] Interface customization

## Technical Features

### 19. Data Validation
- [ ] Organization number validation (Luhn algorithm)
- [ ] Account number validation per kontoplan
- [ ] Date validation (fiscal year boundaries)
- [ ] Duplicate transaction detection
- [ ] Balance validation

### 20. Performance
- [ ] Handle multiple companies efficiently
- [ ] Fast transaction entry
- [ ] Quick report generation
- [ ] Efficient search

### 21. Security
- [ ] Data encryption at rest
- [ ] User authentication (if multi-user)
- [ ] Audit trail
- [ ] Role-based access control
- [ ] Secure backup

## Priority Levels

### MUST HAVE (Phase 1 - MVP)
1. Company management (add/edit/view)
2. BAS 2024 kontoplan
3. Basic transaction entry (verifikationer)
4. Balance validation (debit = credit)
5. Basic reports (balance sheet, income statement)
6. Company switcher
7. Data persistence

### SHOULD HAVE (Phase 2)
1. VAT handling
2. Bank reconciliation
3. Transaction search/filtering
4. SIE export
5. Backup/restore
6. Transaction attachments
7. Period closing

### NICE TO HAVE (Phase 3)
1. Bank statement import
2. Customer/supplier registers
3. Invoice tracking
4. Salary handling
5. Multi-user support
6. Mobile companion app
7. Cloud sync

## Competitive Analysis

### What existing software does (to improve upon):
- **Fortnox**: Cloud-based, comprehensive but expensive
- **Visma**: Complex, steep learning curve
- **PE Accounting**: Modern interface but limited
- **Speedledger**: Good but missing workflow features

### Your competitive advantages:
1. Multi-company optimized workflow
2. Modern, fast interface
3. Keyboard-driven for speed
4. Offline-first (no internet required)
5. One-time purchase, no subscription
6. Tailored for Swedish regulations
7. Built with accountant feedback (your mother)

## Interview Questions for Your Mother

Ask her:
1. What are the 5 tasks she does most frequently?
2. What frustrates her most about current software?
3. How does she switch between companies now?
4. What reports does she generate most often?
5. How does she handle bank reconciliation?
6. What would save her the most time?
7. Does she need invoice management or just bookkeeping?
8. How important is SIE export for her?
9. Does she work with other accountants (collaboration)?
10. What keyboard shortcuts would she love?

## Development Roadmap Suggestion

**Month 1-2**: Core bookkeeping (companies, accounts, transactions)
**Month 3**: Reports and VAT
**Month 4**: Bank reconciliation and SIE export
**Month 5**: Polish UI, add shortcuts, optimize workflow
**Month 6**: Testing, bug fixes, documentation

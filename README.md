# Accounting Software

A modern desktop accounting application built with Electron and React, designed for accountants managing multiple companies.

## Tech Stack

- **Electron**: Desktop application framework
- **React + TypeScript**: User interface
- **Vite**: Build tool and dev server
- **SQLite**: Local database via sql.js
- **Electron Builder**: Application packaging

## Project Structure

```
accounting-app/
├── electron/          # Electron main process
│   ├── main.js       # Main entry point, database initialization
│   └── preload.js    # Preload script for IPC
├── src/              # React application
│   ├── App.tsx       # Main React component
│   ├── App.css       # Application styles
│   └── main.tsx      # React entry point
├── index.html        # HTML template
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Dependencies and scripts
```

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup
```powershell
cd C:\Users\Damien\Desktop\accounting-app
npm install
```

### Running in Development

**Option 1: Two terminals (recommended)**
1. Terminal 1 - Start Vite dev server:
   ```powershell
   npm run dev
   ```
2. Terminal 2 - Start Electron:
   ```powershell
   npm run electron:dev
   ```

**Option 2: Web-only development**
```powershell
npm run dev
```
Then open http://localhost:5173 in your browser.

### Building for Production
```powershell
npm run electron:build
```
The installer will be created in the `release/` directory.

## Database Schema

The SQLite database includes:
- **companies**: Client company information
- **accounts**: Chart of accounts (kontoplan) per company
- **transactions**: Financial transactions
- **transaction_lines**: Double-entry transaction lines (debit/credit)

Database location: `%APPDATA%/accounting-app/accounting.db`

## Features (Planned)

### Phase 1 - Foundation
- [x] Project setup
- [ ] Company management (CRUD)
- [ ] Chart of accounts setup (BAS 2024)
- [ ] Basic transaction entry

### Phase 2 - Core Features
- [ ] Transaction search and filtering
- [ ] Account reconciliation
- [ ] Basic reports (balance, income statement)
- [ ] Export to Excel/CSV

### Phase 3 - Advanced
- [ ] VAT handling
- [ ] Period closing
- [ ] Multi-user support
- [ ] Backup/restore functionality

## Next Steps

1. Implement company management (Add/Edit/Delete companies)
2. Import BAS 2024 chart of accounts
3. Create transaction entry form with double-entry validation
4. Build basic reporting functionality
5. Add data export features

## Swedish Accounting Compliance

This software aims to comply with:
- Bokföringslagen (BFL)
- BAS 2024 kontoplan
- Swedish VAT rules
- K-regelverken

## License

ISC

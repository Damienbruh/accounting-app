# Troubleshooting Guide

## Empty Electron Window

If the Electron window appears but is blank:

1. **Check the console**: Open DevTools in Electron (they open automatically in dev mode) and check for errors
2. **Verify Vite is running**: Make sure the Vite dev server is running on the correct port (5173)
3. **Check the port in main.js**: Ensure `electron/main.js` line 21 matches the Vite port

## Database Issues

### Module Version Mismatch
If you see `NODE_MODULE_VERSION` errors:
- We switched from `better-sqlite3` to `sql.js` to avoid native module compilation issues
- `sql.js` is pure JavaScript and doesn't require rebuilding for Electron

### Database Not Saving
If data doesn't persist:
- Check the database path: `%APPDATA%\accounting-app\accounting.db`
- Look for error messages in the Electron console
- The database is automatically saved after each operation

## Development Workflow

### Two-Terminal Setup (Recommended)
```powershell
# Terminal 1
npm run dev

# Terminal 2 (after Vite starts)
npm run electron:dev
```

### Browser-Only Testing
```powershell
npm run dev
# Then open http://localhost:5173
```
Note: Database features won't work in browser mode

## Common Errors

### "Cannot find module"
```powershell
npm install
```

### Port Already in Use
```powershell
# Kill process on port 5173
netstat -ano | findstr :5173
taskkill /PID <process_id> /F
```

### TypeScript Errors
```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

## Checking if Everything Works

1. Start both dev server and Electron
2. The window should show "Accounting Software" header
3. Check console: should see "Running in Electron: true"
4. Try adding a company - it should appear in the list
5. Close and reopen the app - company should still be there

## Database Location

Windows: `C:\Users\<YourUsername>\AppData\Roaming\accounting-app\accounting.db`

You can inspect the database with any SQLite viewer tool.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// This script clears the database for testing purposes
// It needs to be run in an Electron context to access app.getPath

const databasePath = path.join(app.getPath('userData'), 'accounting.db');

console.log('Database path:', databasePath);

if (fs.existsSync(databasePath)) {
  try {
    fs.unlinkSync(databasePath);
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
} else {
  console.log('Database does not exist - nothing to clear.');
}

// Exit the Electron app
app.quit();

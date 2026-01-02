require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { google } = require('googleapis');

async function testConnection() {
  console.log('--- Google Sheets Diagnostic ---');
  
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  console.log(`Sheet ID present: ${!!sheetId}`);
  console.log(`Email present: ${!!email}`);
  console.log(`Private Key present: ${!!key}`);

  if (!sheetId || !email || !key) {
    console.error('❌ Missing environment variables.');
    return;
  }

  // Handle newline characters in private key which is a common issue
  if (key) {
      key = key.replace(/\\n/g, '\n');
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    console.log('✅ Auth Client created successfully.');

    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log(`Attempting to read metadata for sheet: ${sheetId}...`);
    const res = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    console.log(`✅ Connection Successful!`);
    console.log(`Title: ${res.data.properties.title}`);
    console.log(`Locale: ${res.data.properties.locale}`);

  } catch (error) {
    console.error('❌ Connection Failed using the provided credentials.');
    console.error('Error Message:', error.message);
    if (error.code === 403) {
        console.error('👉 Hint: Using the email above, ensure you shared the spreadsheet with "Editor" permissions.');
        console.error(`   Email to share with: ${email}`);
    } else if (error.code === 404) {
        console.error('👉 Hint: Spreadsheet ID might be incorrect.');
    } else if (error.message.includes('PEM')) {
        console.error('👉 Hint: Private Key format is likely invalid. Ensure it includes -----BEGIN PRIVATE KEY----- and newlines are correct.');
    }
  }
}

testConnection();

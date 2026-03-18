const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'app-config.json');
const appUrl = (process.env.APP_URL || 'http://localhost:5173').trim();

const config = {
  appUrl,
};

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Desktop app URL prepared: ${appUrl}`);

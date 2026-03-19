const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'app-config.json');
const appUrl = (process.env.APP_URL || 'http://localhost:5173').trim();
const updateProvider = (process.env.DESKTOP_UPDATE_PROVIDER || '').trim().toLowerCase();
const updateUrl = (process.env.DESKTOP_UPDATE_URL || '').trim();
const updateOwner = (process.env.DESKTOP_UPDATE_OWNER || '').trim();
const updateRepo = (process.env.DESKTOP_UPDATE_REPO || '').trim();

const resolveUpdateConfig = () => {
  if (updateProvider === 'github' || (!updateProvider && updateOwner && updateRepo)) {
    if (!updateOwner || !updateRepo) {
      return null;
    }

    return {
      provider: 'github',
      owner: updateOwner,
      repo: updateRepo,
    };
  }

  if (updateProvider === 'generic' || (!updateProvider && updateUrl)) {
    if (!updateUrl) {
      return null;
    }

    return {
      provider: 'generic',
      url: updateUrl,
    };
  }

  return null;
};

const config = {
  appUrl,
  update: resolveUpdateConfig(),
};

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Desktop app URL prepared: ${appUrl}`);
if (config.update) {
  console.log(`Desktop update feed prepared: ${config.update.provider}`);
} else {
  console.log('Desktop update feed not configured.');
}

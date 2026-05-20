const { withNativeWind } = require('nativewind/metro');
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const urlPath = req.url.split('?')[0];
      if (urlPath === '/log-error') {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const logFile = path.join(__dirname, 'agent_feedback.json');
              
              let logs = [];
              if (fs.existsSync(logFile)) {
                try {
                  logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                } catch (e) {
                  // ignore
                }
              }
              
              const errorsToSync = Array.isArray(payload) ? payload : [payload];
              const updatedErrorsForClient = [];
              
              for (const error of errorsToSync) {
                const idx = logs.findIndex(l => l.id === error.id);
                if (idx >= 0) {
                  if (logs[idx].fixed) {
                    error.fixed = true;
                  }
                  logs[idx] = error;
                } else {
                  logs.push(error);
                }
                updatedErrorsForClient.push(error);
              }
              
              fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf8');
              console.log(`\x1b[32m[Dev-Logger]\x1b[0m Synchronisierte ${errorsToSync.length} Fehler.`);
              
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
              });
              res.end(JSON.stringify({ success: true, errors: updatedErrorsForClient }));
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }
      }
      return middleware(req, res, next);
    };
  }
};

module.exports = withNativeWind(config, { input: './global.css' });

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const LOG_FILE = path.join(__dirname, '..', 'agent_feedback.json');

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log-error') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const errorLog = JSON.parse(body);
        let existing = [];
        
        if (fs.existsSync(LOG_FILE)) {
          try {
            existing = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
            if (!Array.isArray(existing)) {
              existing = [];
            }
          } catch (e) {
            existing = [];
          }
        }
        
        // Check if error already logged
        const idx = existing.findIndex(e => e.id === errorLog.id);
        if (idx >= 0) {
          existing[idx] = errorLog;
        } else {
          existing.push(errorLog);
        }
        
        fs.writeFileSync(LOG_FILE, JSON.stringify(existing, null, 2), 'utf8');
        console.log(`[Dev-Logger] Fehler protokolliert: "${errorLog.description}" (ID: ${errorLog.id})`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('[Dev-Logger] Fehler beim Verarbeiten:', e.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ungültiges JSON oder Datenfehler' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/errors') {
    let data = [];
    if (fs.existsSync(LOG_FILE)) {
      try {
        data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      } catch (e) {
        data = [];
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Dev-Logger läuft auf http://localhost:${PORT}`);
  console.log(`📂 Logs werden gespeichert in: ${LOG_FILE}`);
  console.log(`==================================================\n`);
});

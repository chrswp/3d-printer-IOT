// vps-backend/jobstate-server.mjs
//
// Menyimpan job state reward sebagai file FISIK "jobstate.json" di folder yang
// sama dengan script ini, pakai lowdb. Kalau file belum ada, otomatis buat default
//
// Listen di 127.0.0.1 saja (bukan 0.0.0.0) - TIDAK diekspos langsung ke internet,
// cuma bisa diakses lewat Nginx reverse proxy di server yang sama. 

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = '127.0.0.1';
const PORT = 4001;
const STATE_FILE = path.join(__dirname, 'jobstate.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const REWARDS_FILE = path.join(__dirname, 'rewards.json');
const OPERATOR_ALERT_FILE = path.join(__dirname, 'operator-alert.json');

function defaultState() {
  return {
    status: false,
    filename: '',
    itemId: 0,
    itemName: '',
    estimatedMinutes: 0,
    startTime: 0
  };
}

function defaultSettings() {
  return { espIp: '', productionMessage: '' };
}

function defaultRewards() {
  return [
    { id: 1,  name: "Gantungan Kunci Gitar", filename: "FILE_1~1.GCO",  estimatedMinutes: 45 },
    { id: 2,  name: "Miniatur Perahu",       filename: "FILE_2~1.GCO",  estimatedMinutes: 80 },
    { id: 3,  name: "Miniatur Mobil",        filename: "FILE_3~1.GCO",  estimatedMinutes: 120 },
    { id: 4,  name: "Stand Smartphone",      filename: "FILE_4~1.GCO",  estimatedMinutes: 105 },
    { id: 5,  name: "Tempat Pensil",         filename: "FILE_5~1.GCO",  estimatedMinutes: 180 },
    { id: 6,  name: "Dadu Game 3D",          filename: "FILE_6~1.GCO",  estimatedMinutes: 30 },
    { id: 7,  name: "Koin Kolektor",         filename: "FILE_7~1.GCO",  estimatedMinutes: 25 },
    { id: 8,  name: "Bintang Penghargaan",   filename: "FILE_8~1.GCO",  estimatedMinutes: 40 },
    { id: 9,  name: "Logo Heksagon",         filename: "FILE_9~1.GCO",  estimatedMinutes: 50 },
    { id: 10, name: "Trofi Mini Level",      filename: "FILE_10~1.GCO", estimatedMinutes: 135 }
  ];
}

function defaultOperatorAlert() {
  return { alert: false, title: '', message: '', itemName: '', filename: '', timestamp: 0 };
}

const adapter = new JSONFile(STATE_FILE);
const db = new Low(adapter, defaultState());

await db.read();
db.data ||= defaultState();
await db.write(); //pastikan file fisik langsung ada

const settingsAdapter = new JSONFile(SETTINGS_FILE);
const settingsDb = new Low(settingsAdapter, defaultSettings());

await settingsDb.read();
settingsDb.data ||= defaultSettings();
await settingsDb.write();

const rewardsAdapter = new JSONFile(REWARDS_FILE);
const rewardsDb = new Low(rewardsAdapter, defaultRewards());

await rewardsDb.read();
if (!Array.isArray(rewardsDb.data) || rewardsDb.data.length === 0) rewardsDb.data = defaultRewards();
await rewardsDb.write();

const operatorAlertAdapter = new JSONFile(OPERATOR_ALERT_FILE);
const operatorAlertDb = new Low(operatorAlertAdapter, defaultOperatorAlert());

await operatorAlertDb.read();
operatorAlertDb.data ||= defaultOperatorAlert();
await operatorAlertDb.write();

console.log('[jobstate-server] jobstate.json siap di:', STATE_FILE);
console.log('[jobstate-server] settings.json siap di:', SETTINGS_FILE);
console.log('[jobstate-server] rewards.json siap di:', REWARDS_FILE);
console.log('[jobstate-server] operator-alert.json siap di:', OPERATOR_ALERT_FILE);

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
  });
}

// PENTING: path di sini termasuk prefix "/api/" karena Nginx meneruskan
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/jobstate' && req.method === 'GET') {
    await db.read();
    db.data ||= defaultState();
    const state = db.data;
    const elapsedMs = state.status ? (Date.now() - (state.startTime || Date.now())) : 0;
    sendJson(res, 200, { ...state, elapsedMs });
    return;
  }

  if (url.pathname === '/api/jobstate/start' && req.method === 'POST') {
    const raw = await readBody(req);
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { /* body kosong/invalid -> pakai default */ }

    db.data = {
      status: true,
      filename: body.filename || '',
      itemId: body.itemId || 0,
      itemName: body.itemName || '',
      estimatedMinutes: body.estimatedMinutes || 0,
      startTime: Date.now()
    };
    await db.write();
    sendJson(res, 200, { ok: true, state: db.data });
    return;
  }

  if (url.pathname === '/api/jobstate/clear' && req.method === 'POST') {
    db.data = defaultState();
    await db.write();
    operatorAlertDb.data = defaultOperatorAlert();
    await operatorAlertDb.write();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/settings' && req.method === 'GET') {
    await settingsDb.read();
    settingsDb.data ||= defaultSettings();
    sendJson(res, 200, settingsDb.data);
    return;
  }

  if (url.pathname === '/api/settings' && req.method === 'POST') {
    const raw = await readBody(req);
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { /* body kosong/invalid -> diabaikan */ }

    if (typeof body.espIp === 'string') {
      settingsDb.data.espIp = body.espIp.trim();
    }
    if (typeof body.productionMessage === 'string') {
      settingsDb.data.productionMessage = body.productionMessage;
    }
    await settingsDb.write();
    sendJson(res, 200, { ok: true, settings: settingsDb.data });
    return;
  }

  if (url.pathname === '/api/operator-alert' && req.method === 'GET') {
    await operatorAlertDb.read();
    operatorAlertDb.data ||= defaultOperatorAlert();
    sendJson(res, 200, operatorAlertDb.data);
    return;
  }

  if (url.pathname === '/api/operator-alert' && req.method === 'POST') {
    const raw = await readBody(req);
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { /* payload kosong/invalid -> tetap set alert:true */ }

    operatorAlertDb.data = {
      alert: true,
      title: String(body.title || ''),
      message: String(body.message || ''),
      itemName: String(body.itemName || ''),
      filename: String(body.filename || ''),
      timestamp: Date.now()
    };
    await operatorAlertDb.write();
    sendJson(res, 200, { ok: true, alert: operatorAlertDb.data });
    return;
  }

  if (url.pathname === '/api/operator-alert/reset' && req.method === 'POST') {
    operatorAlertDb.data = defaultOperatorAlert();
    await operatorAlertDb.write();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/rewards' && req.method === 'GET') {
    await rewardsDb.read();
    if (!Array.isArray(rewardsDb.data) || rewardsDb.data.length === 0) rewardsDb.data = defaultRewards();
    sendJson(res, 200, rewardsDb.data);
    return;
  }

  if (url.pathname === '/api/rewards' && req.method === 'POST') {
    const raw = await readBody(req);
    let body = [];
    try { body = JSON.parse(raw || '[]'); } catch (e) { /* invalid -> diabaikan */ }

    if (Array.isArray(body) && body.length > 0) {
      rewardsDb.data = body.map((item, idx) => ({
        id: Number(item.id) || (idx + 1),
        name: String(item.name || '').trim() || `Reward ${idx + 1}`,
        filename: String(item.filename || '').trim(),
        estimatedMinutes: Math.max(0, Number(item.estimatedMinutes) || 0)
      }));
      await rewardsDb.write();
      sendJson(res, 200, { ok: true, rewards: rewardsDb.data });
    } else {
      sendJson(res, 400, { ok: false, error: 'invalid_payload' });
    }
    return;
  }

  sendJson(res, 404, { error: 'not_found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[jobstate-server] jalan di http://${HOST}:${PORT} (internal, di-proxy Nginx)`);
});

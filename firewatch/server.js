const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DEVICE_KEY = process.env.DEVICE_KEY || 'change-me';
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const TG_TOKEN = process.env.TG_TOKEN;   // optional Telegram bot token
const TG_CHAT = process.env.TG_CHAT;     // optional Telegram chat id
const OFFLINE_MS = 10000;
const ARM_MS = 30000;

const state = {
  online: false, lastSeen: 0, rssi: null,
  fire: false, fireSince: null,
  muted: false,
  suppression: 'idle',      // idle | armed | active
  armedUntil: 0,
  events: []
};
let pending = [];           // commands waiting for the device
let delivered = false;      // suppress command handed to device
const clients = new Set();

function log(type, msg) {
  state.events.unshift({ t: Date.now(), type, msg });
  state.events.length = Math.min(state.events.length, 100);
  console.log(new Date().toISOString(), type, msg);
}
function publish() {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(data);
}
async function notify(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text })
    });
  } catch (e) { console.error('telegram failed:', e.message); }
}

// ---- Device endpoint (ESP32 / simulator) ----
app.post('/api/telemetry', (req, res) => {
  if (req.get('x-device-key') !== DEVICE_KEY) return res.sendStatus(401);
  const { fire, suppressing, rssi } = req.body || {};

  if (!state.online) log('info', 'Device online');
  state.online = true;
  state.lastSeen = Date.now();
  state.rssi = rssi ?? null;

  if (!!fire !== state.fire) {
    state.fire = !!fire;
    state.fireSince = fire ? Date.now() : null;
    if (fire) {
      log('fire', 'FIRE DETECTED');
      notify('🔥 FIRE DETECTED by sensor node. Check the area immediately.');
    } else {
      log('info', 'Flame cleared');
      notify('✅ Flame cleared on sensor node.');
    }
  }

  if (suppressing && state.suppression !== 'active') state.suppression = 'active';
  if (!suppressing && state.suppression === 'active' && delivered) {
    state.suppression = 'idle';
    delivered = false;
    log('suppress', 'Suppression demo finished');
  }

  const cmds = pending.splice(0);
  if (cmds.includes('suppress')) delivered = true;
  publish();
  res.json({ commands: cmds, muted: state.muted });
});

// ---- Operator endpoints (PIN protected) ----
const auth = (req, res, next) =>
  req.body && req.body.pin === ADMIN_PIN ? next() : res.status(403).json({ error: 'Wrong PIN' });

app.post('/api/arm', auth, (req, res) => {
  if (!state.online) return res.status(409).json({ error: 'Device is offline' });
  state.suppression = 'armed';
  state.armedUntil = Date.now() + ARM_MS;
  log('suppress', 'Demo suppression armed for 30 s');
  publish();
  res.json({ ok: true });
});

app.post('/api/suppress', auth, (req, res) => {
  if (state.suppression !== 'armed' || Date.now() > state.armedUntil)
    return res.status(409).json({ error: 'Arm the system first' });
  pending.push('suppress');
  delivered = false;
  state.suppression = 'active';
  log('suppress', 'Operator started suppression demo');
  publish();
  res.json({ ok: true });
});

app.post('/api/stop', auth, (req, res) => {
  pending = ['stop'];
  state.suppression = 'idle';
  delivered = false;
  log('suppress', 'Operator stopped suppression');
  publish();
  res.json({ ok: true });
});

app.post('/api/mute', auth, (req, res) => {
  state.muted = !!req.body.muted;
  log('info', state.muted ? 'Buzzer muted' : 'Buzzer unmuted');
  publish();
  res.json({ ok: true });
});

// ---- Live stream to dashboards (Server-Sent Events) ----
app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  clients.add(res);
  const ka = setInterval(() => res.write(': ka\n\n'), 20000);
  req.on('close', () => { clearInterval(ka); clients.delete(res); });
});

setInterval(() => {
  let changed = false;
  if (state.online && Date.now() - state.lastSeen > OFFLINE_MS) {
    state.online = false; changed = true;
    log('warn', 'Device went offline');
    notify('⚠️ Fire sensor node went offline.');
  }
  if (state.suppression === 'armed' && Date.now() > state.armedUntil) {
    state.suppression = 'idle'; changed = true;
    log('suppress', 'Arm timed out');
  }
  if (changed) publish();
}, 3000);

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log(`FireWatch running on http://localhost:${PORT}`));

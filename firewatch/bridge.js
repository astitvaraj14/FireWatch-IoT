// Reads the Uno over USB and forwards to the FireWatch server.
// Usage: node bridge.js COM3     (Windows)   |   node bridge.js /dev/ttyUSB0   (Linux/Mac)
// Omit the port to auto-detect. Env: URL (default http://localhost:3000), DEVICE_KEY.
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const URL = process.env.URL || 'http://localhost:3000';
const KEY = process.env.DEVICE_KEY || 'change-me';
let fire = false, sup = false, muted = false, lastLine = 0, port = null, unknown = 0;

async function findPort() {
  if (process.argv[2]) return process.argv[2];
  const list = await SerialPort.list();
  console.log('Ports:', list.map(x => x.path).join(', ') || 'none');
  const p = list.find(x => /arduino|wch|ch340|usb serial|ftdi/i.test(`${x.manufacturer} ${x.friendlyName}`)) || list[0];
  return p && p.path.replace('/dev/tty.', '/dev/cu.');
}

async function connect() {
  const path = await findPort();
  if (!path) { console.log('No serial port found. Plug in the Uno. Retrying...'); return setTimeout(connect, 3000); }
  console.log('Opening', path);
  port = new SerialPort({ path, baudRate: 9600 }, err => {
    if (err) { console.log('Open failed:', err.message); setTimeout(connect, 3000); }
  });
  setTimeout(() => { if (!lastLine) console.log('No data yet. Check: uno_node.ino uploaded, Serial Monitor closed, use /dev/cu.* port.'); }, 6000);
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  parser.on('data', line => {
    const m = line.trim().match(/^FIRE:([01]),SUP:([01])$/);
    if (!m) { if (unknown++ < 5) console.log('Unrecognised line from Uno:', JSON.stringify(line.trim()), '(upload uno_node.ino?)'); return; }
    const f = m[1] === '1';
    lastLine = Date.now();
    sup = m[2] === '1';
    if (f !== fire) { fire = f; console.log(fire ? 'FIRE detected' : 'Flame cleared'); send(); }
    fire = f;
  });
  port.on('close', () => { console.log('Serial closed. Reconnecting...'); port = null; setTimeout(connect, 3000); });
  port.on('error', e => console.log('Serial error:', e.message));
}

function write(c) { if (port && port.isOpen) port.write(c); }

async function send() {
  if (!port || Date.now() - lastLine > 3000) return;   // no fresh data -> server marks node offline
  try {
    const r = await fetch(`${URL}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-key': KEY },
      body: JSON.stringify({ fire, suppressing: sup })
    });
    if (!r.ok) return console.log('Server rejected data:', r.status);
    const j = await r.json();
    for (const c of j.commands || []) {
      if (c === 'suppress') { write('S'); console.log('Suppression demo started'); }
      if (c === 'stop') { write('X'); console.log('Stopped'); }
    }
    if (j.muted !== muted) { muted = j.muted; write(muted ? 'M' : 'U'); }
  } catch { console.log('Server unreachable'); }
}

setInterval(send, 2000);
connect();

// Fake sensor node so you can test the app without hardware.
// Fire starts after 10 s. Press Enter to toggle fire manually.
const URL = process.env.URL || 'http://localhost:3000';
const KEY = process.env.DEVICE_KEY || 'change-me';
let fire = false, suppressing = false, timer = null;

setTimeout(() => { fire = true; console.log('sim: fire started'); }, 10000);
process.stdin.on('data', () => { fire = !fire; console.log('sim: fire =', fire); });

function stopSup() {
  suppressing = false; clearTimeout(timer);
  if (fire) { fire = false; console.log('sim: fire extinguished'); }
}

async function tick() {
  try {
    const r = await fetch(`${URL}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-key': KEY },
      body: JSON.stringify({ fire, suppressing, rssi: -55 })
    });
    const j = await r.json();
    for (const c of j.commands || []) {
      if (c === 'suppress' && !suppressing) {
        suppressing = true; console.log('sim: pump ON');
        timer = setTimeout(() => { stopSup(); console.log('sim: pump OFF'); }, 5000);
      }
      if (c === 'stop') { stopSup(); console.log('sim: stopped'); }
    }
  } catch (e) { console.log('sim: server unreachable'); }
}
setInterval(tick, 2000); tick();

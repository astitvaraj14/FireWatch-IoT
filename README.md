# FireWatch

1. `npm install && npm start` (Node 18+). Open http://localhost:3000
2. No hardware yet? `npm run simulate` in a second terminal (fire starts after 10 s).
3. Flash `firmware/fire_node/fire_node.ino` to an ESP32 (set Wi-Fi, SERVER_URL, DEVICE_KEY).
4. Env vars: DEVICE_KEY, ADMIN_PIN (default 1234, change it), TG_TOKEN + TG_CHAT for Telegram alerts.
5. Phone: open the server URL, then "Add to Home Screen". Notifications/install need HTTPS or localhost (use ngrok or deploy on Render/Railway).

ESP32 wiring: flame sensor VCC->3V3, GND->GND, OUT->GPIO27 | buzzer + -> GPIO26, - -> GND | relay/LED IN -> GPIO25.

## Arduino Uno (USB) option
1. Upload `firmware/uno_node/uno_node.ino` (close the Arduino Serial Monitor afterwards, it blocks the port).
2. `npm install`, start the server, then `node bridge.js COM3` (your port; omit to auto-detect).
Same wiring as before, plus demo relay/LED on D8. Keep the laptop plugged in and awake.

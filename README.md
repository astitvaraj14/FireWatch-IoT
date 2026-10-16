# 🔥 FireWatch — IoT-Based Fire Detection and Monitoring System

FireWatch is an Internet of Things (IoT) project designed to detect potential fire conditions using a flame sensor and provide monitoring through a web dashboard. It supports ESP32-based hardware and an Arduino Uno USB-based option, along with a simulator for testing without physical hardware.

## ✨ Features

- **Fire detection:** Reads sensor input to identify potential fire conditions.
- **Web dashboard:** Provides a browser-based interface for monitoring.
- **Hardware support:** Supports ESP32 and Arduino Uno configurations.
- **Simulation mode:** Test the system without connecting physical hardware.
- **Alert integration:** Supports Telegram alerts when configured.
- **Mobile-friendly access:** Can be opened in a mobile browser and added to the home screen.

## 🛠️ Technologies Used

- Node.js
- JavaScript
- HTML and CSS
- ESP32
- Arduino Uno
- Flame sensor
- IoT communication and browser-based monitoring

## 📁 Project Structure

```text
FireWatch-IoT/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   └── icon.svg
├── firmware/
│   ├── fire_node/
│   │   └── fire_node.ino
│   └── uno_node/
│       └── uno_node.ino
├── bridge.js
├── simulate.js
├── server.js
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or later
- npm
- A modern web browser

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

Open the following URL in your browser:

http://localhost:3000

### 3. Run the simulator

If you don't have the hardware, open a second terminal and run:

```bash
npm run simulate
```

The simulator generates test sensor activity. According to the current project configuration, a fire event is simulated after approximately 10 seconds.

## 🔌 ESP32 Hardware Setup

### Components

- ESP32 development board
- Flame sensor
- Buzzer
- Relay module or LED for demonstration
- Jumper wires
- USB cable and suitable power source

### Wiring

| Component | ESP32 connection |
|---|---|
| Flame sensor VCC | 3.3V |
| Flame sensor GND | GND |
| Flame sensor OUT | GPIO 27 |
| Buzzer positive | GPIO 26 |
| Buzzer negative | GND |
| Relay/LED input | GPIO 25 |

Check your particular sensor and module specifications before connecting them. Use a suitable driver for loads that cannot be powered directly by an ESP32 GPIO.

### Firmware configuration

1. Open `firmware/fire_node/fire_node.ino` in the Arduino IDE.
2. Configure the Wi-Fi credentials, server URL, and device key.
3. Select the appropriate ESP32 board and port.
4. Upload the firmware.
5. Ensure the device can reach the server over the network.

**Security:** Do not commit real Wi-Fi passwords or device keys to a public repository. Use local configuration and keep secrets out of version control.

## 🔗 Arduino Uno USB Setup

1. Upload `firmware/uno_node/uno_node.ino` using the Arduino IDE.
2. Close the Arduino Serial Monitor before starting the bridge.
3. Install the Node.js dependencies:

```bash
npm install
```

4. Start the server in one terminal:

```bash
npm start
```

5. Start the USB bridge in another terminal, replacing `COM3` with your actual serial port:

```bash
node bridge.js COM3
```

If supported by the project, omit the port argument to use automatic port detection.

The Uno configuration uses D8 for the demonstration relay or LED. Keep the computer connected and awake while using the USB bridge.

## 🔐 Configuration

Configure the environment variables supported by the application:

| Variable | Purpose |
|---|---|
| `DEVICE_KEY` | Device authentication |
| `ADMIN_PIN` | Administrative access |
| `TG_TOKEN` | Telegram bot token |
| `TG_CHAT` | Telegram destination chat |

Set these values in your local environment or a private environment configuration. Never publish real credentials.

Change any default administrative PIN before deployment. Environment-variable names and behaviour should match the current application implementation.

## 📱 Mobile Access and Deployment

- Open the server URL from a phone that can reach the server.
- Use the browser's **Add to Home Screen** option if supported.
- HTTPS is generally required for service workers and browser notifications outside localhost.
- For remote access, deploy to a suitable hosting platform or use a secure HTTPS tunnel for development.

Do not expose administrative endpoints or device credentials to the public internet without appropriate security controls.

## 🧪 Testing

The simulator can help test the application without physical hardware. Test the hardware separately before relying on it for real-world fire detection.

Suggested checks:

- Confirm that the dashboard loads.
- Verify simulated sensor events.
- Verify communication between the device and server.
- Test alert delivery when configured.
- Check behaviour when the device or network disconnects.

## ⚠️ Safety Disclaimer

FireWatch is an educational IoT project and prototype. It is not a certified fire alarm or life-safety system. Do not rely on it as a replacement for approved smoke detectors, fire alarms, or professional fire-protection equipment.

## 👩‍💻 Author

Developed as an IoT project to explore embedded systems, sensor monitoring, Node.js, and web-based interfaces.

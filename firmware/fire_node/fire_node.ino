// ESP32 fire node: flame sensor + buzzer + demo suppression output, reports to FireWatch server.
// Board: "ESP32 Dev Module". Libraries: built-in WiFi, HTTPClient, WiFiClientSecure.
// Local alarm keeps working even if Wi-Fi or the server is down.
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* WIFI_SSID  = "YOUR_WIFI";
const char* WIFI_PASS  = "YOUR_PASSWORD";
const char* SERVER_URL = "http://192.168.1.50:3000";   // no trailing slash; https:// also works
const char* DEVICE_KEY = "change-me";                  // must match server DEVICE_KEY

const int PIN_FLAME  = 27;   // sensor DO/OUT (LOW = flame). Power sensor from 3.3V so the signal is 3.3V-safe
const int PIN_BUZZER = 26;   // active buzzer +
const int PIN_DEMO   = 25;   // demo suppression: relay IN -> small 5V pump, or just an LED
const bool DEMO_ACTIVE_HIGH = true;        // set false for active-LOW relay modules
const unsigned long SUPPRESS_MS = 5000;    // hard limit: demo output never stays on longer

bool fire = false, muted = false, suppressing = false, buzzOn = false, sendNow = true;
int lowCount = 0, highCount = 0;
unsigned long lastRead = 0, lastBeep = 0, lastSend = 0, supStart = 0, lastWifi = 0;

void demoOutput(bool on) { digitalWrite(PIN_DEMO, (on == DEMO_ACTIVE_HIGH) ? HIGH : LOW); }

void startSuppress() {
  if (suppressing) return;
  suppressing = true; supStart = millis(); demoOutput(true); sendNow = true;
}
void stopSuppress() {
  if (!suppressing) return;
  suppressing = false; demoOutput(false); sendNow = true;
}

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String(SERVER_URL) + "/api/telemetry";
  HTTPClient http;
  WiFiClientSecure secure;
  if (url.startsWith("https")) { secure.setInsecure(); http.begin(secure, url); }
  else http.begin(url);
  http.setTimeout(2000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);
  String body = String("{\"fire\":") + (fire ? "true" : "false") +
                ",\"suppressing\":" + (suppressing ? "true" : "false") +
                ",\"rssi\":" + WiFi.RSSI() + "}";
  int code = http.POST(body);
  if (code == 200) {
    String r = http.getString();
    muted = r.indexOf("\"muted\":true") >= 0;
    if (r.indexOf("\"suppress\"") >= 0) startSuppress();
    if (r.indexOf("\"stop\"") >= 0) stopSuppress();
  }
  http.end();
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_FLAME, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_DEMO, OUTPUT);
  demoOutput(false);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void loop() {
  unsigned long now = millis();

  // Read sensor every 200 ms; need 3 hits to confirm fire, 5 clear reads to reset (debounce)
  if (now - lastRead >= 200) {
    lastRead = now;
    bool flame = digitalRead(PIN_FLAME) == LOW;
    if (flame) { lowCount = min(lowCount + 1, 10); highCount = 0; }
    else       { highCount = min(highCount + 1, 10); lowCount = 0; }
    if (!fire && lowCount >= 3) { fire = true;  sendNow = true; Serial.println("FIRE"); }
    if (fire && highCount >= 5) { fire = false; sendNow = true; Serial.println("CLEAR"); }
  }

  // Non-blocking beeping (unlike delay(5000), the sensor keeps being read)
  if (fire && !muted) {
    if (now - lastBeep >= 250) { lastBeep = now; buzzOn = !buzzOn; digitalWrite(PIN_BUZZER, buzzOn); }
  } else { buzzOn = false; digitalWrite(PIN_BUZZER, LOW); }

  if (suppressing && now - supStart >= SUPPRESS_MS) stopSuppress();

  if (WiFi.status() != WL_CONNECTED && now - lastWifi > 10000) { lastWifi = now; WiFi.reconnect(); }

  if (sendNow || now - lastSend >= 2000) {
    sendNow = false; lastSend = now;
    sendTelemetry();
  }
}

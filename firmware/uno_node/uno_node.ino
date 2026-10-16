// Arduino Uno fire node (same wiring as your circuit): sensor OUT->D6, buzzer +->D4.
// Extra for the suppression demo: relay IN or LED (with 220 ohm resistor) -> D8.
// Talks to bridge.js over USB serial at 9600. Local alarm works even if the PC is off.
const int buzzerPin = 4;
const int fireSensorPin = 6;
const int demoPin = 8;
const unsigned long SUPPRESS_MS = 5000;   // hard limit for the demo output

bool fire = false, muted = false, suppressing = false, buzzOn = false;
int lowCount = 0, highCount = 0;
unsigned long lastRead = 0, lastBeep = 0, lastReport = 0, supStart = 0;

void setup() {
  Serial.begin(9600);
  pinMode(buzzerPin, OUTPUT);
  pinMode(fireSensorPin, INPUT);
  pinMode(demoPin, OUTPUT);
  digitalWrite(demoPin, LOW);   // use HIGH here and below if your relay is active-LOW
}

void loop() {
  unsigned long now = millis();

  // Sensor: 0 = fire. Debounced: 3 fire reads to trigger, 5 clear reads to reset.
  if (now - lastRead >= 200) {
    lastRead = now;
    if (digitalRead(fireSensorPin) == LOW) { if (lowCount < 10) lowCount++; highCount = 0; }
    else { if (highCount < 10) highCount++; lowCount = 0; }
    if (!fire && lowCount >= 3) fire = true;
    if (fire && highCount >= 5) fire = false;
  }

  // Non-blocking buzzer (no delay, so the sensor is always being read)
  if (fire && !muted) {
    if (now - lastBeep >= 250) { lastBeep = now; buzzOn = !buzzOn; digitalWrite(buzzerPin, buzzOn); }
  } else { buzzOn = false; digitalWrite(buzzerPin, LOW); }

  // Commands from bridge: S = suppress demo, X = stop, M = mute, U = unmute
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 'S' && !suppressing) { suppressing = true; supStart = now; digitalWrite(demoPin, HIGH); }
    if (c == 'X') { suppressing = false; digitalWrite(demoPin, LOW); }
    if (c == 'M') muted = true;
    if (c == 'U') muted = false;
  }
  if (suppressing && now - supStart >= SUPPRESS_MS) { suppressing = false; digitalWrite(demoPin, LOW); }

  // Status line every 500 ms, e.g. "FIRE:1,SUP:0"
  if (now - lastReport >= 500) {
    lastReport = now;
    Serial.print("FIRE:"); Serial.print(fire ? 1 : 0);
    Serial.print(",SUP:");  Serial.println(suppressing ? 1 : 0);
  }
}

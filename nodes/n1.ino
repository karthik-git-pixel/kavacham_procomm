#include <Arduino.h>
#include <Wire.h>
#include <NimBLEDevice.h>

// =====================================================
// KAVACHAM - NODE 1
// =====================================================

// ---------------- NODE ----------------
#define NODE_ID   1
#define NODE_TYPE 1

// ---------------- PINS ----------------
#define MPU_SDA       21
#define MPU_SCL       22

#define DHT_PIN        4
#define MQ6_AO        34
#define MQ6_DO        18

#define BUTTON_PIN    23
#define BUZZER_PIN     5

// ---------------- THRESHOLDS ----------------
#define GAS_THRESHOLD   800
#define TEMP_THRESHOLD  70.0

// ---------------- MPU6500 ----------------
#define MPU_ADDR 0x68

#define ACCEL_SCALE 4096.0
#define GYRO_SCALE  65.5

#define FREE_FALL_THRESHOLD 0.65
#define IMPACT_THRESHOLD    2.0
#define GYRO_THRESHOLD      180.0

#define FALL_WINDOW_MS      1000
#define FALL_COOLDOWN_MS    3000

// ---------------- TIMING ----------------
#define SENSOR_INTERVAL_MS  2000
#define IMU_INTERVAL_MS       10
#define SOS_INTERVAL_MS      500
#define MANUAL_BURST_MS      700

// =====================================================
// GLOBAL VARIABLES
// =====================================================

int gasValue = 0;
float temperature = 0.0;

bool gasUnsafe = false;
bool tempUnsafe = false;
bool fallUnsafe = false;

bool automaticSOS = false;

bool acknowledgedCurrentEmergency = false;

bool previousCriticalState = false;

// Button state
bool buttonWasPressed = false;

// BLE sequence
uint8_t sequenceNumber = 0;

// Timing
unsigned long lastSensorRead = 0;
unsigned long lastIMURead = 0;
unsigned long lastSOSTransmit = 0;

unsigned long manualTransmitUntil = 0;

// Fall detection
unsigned long fallFreeFallTime = 0;
unsigned long lastFallTime = 0;

bool freeFallDetected = false;

// BLE
NimBLEAdvertising* advertising = nullptr;

// =====================================================
// MPU6500 FUNCTIONS
// =====================================================

void initMPU6500() {
  Wire.begin(MPU_SDA, MPU_SCL);

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission(true);

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1B);
  Wire.write(0x08);
  Wire.endTransmission(true);

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1C);
  Wire.write(0x10);
  Wire.endTransmission(true);

  Serial.println("MPU6500 initialized");
}

void readMPU6500(
  float &ax,
  float &ay,
  float &az,
  float &gx,
  float &gy,
  float &gz
) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);

  Wire.requestFrom(MPU_ADDR, 14, true);

  int16_t rawAx = Wire.read() << 8 | Wire.read();
  int16_t rawAy = Wire.read() << 8 | Wire.read();
  int16_t rawAz = Wire.read() << 8 | Wire.read();

  Wire.read();
  Wire.read();

  int16_t rawGx = Wire.read() << 8 | Wire.read();
  int16_t rawGy = Wire.read() << 8 | Wire.read();
  int16_t rawGz = Wire.read() << 8 | Wire.read();

  ax = rawAx / ACCEL_SCALE;
  ay = rawAy / ACCEL_SCALE;
  az = rawAz / ACCEL_SCALE;

  gx = rawGx / GYRO_SCALE;
  gy = rawGy / GYRO_SCALE;
  gz = rawGz / GYRO_SCALE;
}

// =====================================================
// FAST FALL DETECTION
// =====================================================

bool detectFall() {
  float ax, ay, az;
  float gx, gy, gz;

  readMPU6500(ax, ay, az, gx, gy, gz);

  float acceleration =
      sqrt(ax * ax + ay * ay + az * az);

  float rotation =
      sqrt(gx * gx + gy * gy + gz * gz);

  unsigned long now = millis();

  if (acceleration < FREE_FALL_THRESHOLD) {
    freeFallDetected = true;
    fallFreeFallTime = now;
  }

  if (freeFallDetected) {

    if (now - fallFreeFallTime <= FALL_WINDOW_MS) {

      if (
        acceleration > IMPACT_THRESHOLD ||
        rotation > GYRO_THRESHOLD
      ) {

        if (now - lastFallTime > FALL_COOLDOWN_MS) {

          lastFallTime = now;
          freeFallDetected = false;

          Serial.println("!!! FALL DETECTED !!!");

          return true;
        }
      }

    } else {
      freeFallDetected = false;
    }
  }

  return false;
}

void updateFallDetection() {

  if (
    millis() - lastIMURead >=
    IMU_INTERVAL_MS
  ) {

    lastIMURead = millis();

    if (detectFall()) {
      fallUnsafe = true;
    }
  }
}

// =====================================================
// DHT11
// =====================================================

bool readDHT11(float &temp) {
  uint8_t data[5] = {0, 0, 0, 0, 0};

  pinMode(DHT_PIN, OUTPUT);
  digitalWrite(DHT_PIN, LOW);
  delay(20);
  digitalWrite(DHT_PIN, HIGH);
  delayMicroseconds(30);
  pinMode(DHT_PIN, INPUT_PULLUP);

  unsigned long timeout = micros();

  while (digitalRead(DHT_PIN) == HIGH) {
    if (micros() - timeout > 100) return false;
  }

  timeout = micros();

  while (digitalRead(DHT_PIN) == LOW) {
    if (micros() - timeout > 100) return false;
  }

  timeout = micros();

  while (digitalRead(DHT_PIN) == HIGH) {
    if (micros() - timeout > 100) return false;
  }

  for (int i = 0; i < 40; i++) {

    timeout = micros();

    while (digitalRead(DHT_PIN) == LOW) {
      if (micros() - timeout > 100) return false;
    }

    unsigned long highStart = micros();

    while (digitalRead(DHT_PIN) == HIGH) {
      if (micros() - highStart > 100) break;
    }

    unsigned long duration =
        micros() - highStart;

    data[i / 8] <<= 1;

    if (duration > 40) {
      data[i / 8] |= 1;
    }
  }

  if (
    data[4] !=
    ((data[0] + data[1] +
      data[2] + data[3]) & 0xFF)
  ) {
    return false;
  }

  temp = data[2];

  return true;
}

// =====================================================
// SAFETY CHECK
// =====================================================

void checkSafety() {

  gasValue = analogRead(MQ6_AO);

  gasUnsafe =
      gasValue > GAS_THRESHOLD;

  float newTemperature;

  if (readDHT11(newTemperature)) {
    temperature = newTemperature;
  }

  tempUnsafe =
      temperature > TEMP_THRESHOLD;

  Serial.println();
  Serial.println("========== NODE 1 ==========");

  Serial.print("Gas       : ");
  Serial.print(gasValue);
  Serial.print(" / ");
  Serial.println(GAS_THRESHOLD);

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Gas Status : ");
  Serial.println(
    gasUnsafe ? "UNSAFE" : "SAFE"
  );

  Serial.print("Temp Status: ");
  Serial.println(
    tempUnsafe ? "UNSAFE" : "SAFE"
  );

  Serial.print("Fall Status: ");
  Serial.println(
    fallUnsafe ? "DETECTED" : "SAFE"
  );

  Serial.print("SOS Status : ");

  if (automaticSOS) {
    Serial.println("AUTOMATIC SOS");
  } else {
    Serial.println("SAFE");
  }

  Serial.println("============================");
}

// =====================================================
// SAFETY STATE
// =====================================================

bool criticalCondition() {
  return (
    gasUnsafe ||
    tempUnsafe ||
    fallUnsafe
  );
}

uint8_t createStatusByte() {

  uint8_t status = 0;

  if (gasUnsafe)
    status |= 0x01;

  if (tempUnsafe)
    status |= 0x02;

  if (fallUnsafe)
    status |= 0x04;

  return status;
}

// =====================================================
// BLE
// =====================================================

void advertisePacket(uint8_t status) {

  uint8_t packet[7];

  packet[0] = 0xCA;
  packet[1] = NODE_ID;
  packet[2] = status;
  packet[3] = sequenceNumber++;
  packet[4] = gasValue;
  packet[5] = (uint8_t)temperature;
  packet[6] = NODE_TYPE;

  std::string data(
    (char*)packet,
    sizeof(packet)
  );

  advertising->stop();
  advertising->clearData();

  NimBLEAdvertisementData advertisement;

  advertisement.setFlags(0x06);
  advertisement.setName("KAVACHAM");
  advertisement.setManufacturerData(data);

  advertising->setAdvertisementData(
    advertisement
  );

  advertising->start();
}

// =====================================================
// AUTOMATIC SOS
// =====================================================

void transmitEmergencyPacket() {

  uint8_t status =
      createStatusByte();

  advertisePacket(status);

  Serial.println(
    "BLE -> AUTOMATIC EMERGENCY"
  );
}

void startAutomaticSOS() {

  automaticSOS = true;

  digitalWrite(
    BUZZER_PIN,
    HIGH
  );

  Serial.println();
  Serial.println(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );
  Serial.println(
    "     AUTOMATIC SOS STARTED"
  );
  Serial.println(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );

  transmitEmergencyPacket();

  lastSOSTransmit = millis();
}

void stopAutomaticSOS() {

  automaticSOS = false;

  digitalWrite(
    BUZZER_PIN,
    LOW
  );

  advertising->stop();

  Serial.println();
  Serial.println(
    "********************************"
  );
  Serial.println(
    "AUTOMATIC SOS ACKNOWLEDGED"
  );
  Serial.println(
    "BLE STOPPED"
  );
  Serial.println(
    "BUZZER OFF"
  );
  Serial.println(
    "********************************"
  );
}

// =====================================================
// MANUAL SOS
// =====================================================

void transmitManualSOS() {

  uint8_t status = 0x08;

  advertisePacket(status);

  manualTransmitUntil =
      millis() + MANUAL_BURST_MS;

  Serial.println();
  Serial.println(
    "================================"
  );
  Serial.println(
    "       MANUAL SOS TRIGGERED"
  );
  Serial.println(
    "================================"
  );
}

// =====================================================
// BUTTON
// =====================================================

void handleButton() {

  bool pressed =
      (digitalRead(BUTTON_PIN) == LOW);

  if (
    pressed &&
    !buttonWasPressed
  ) {

    buttonWasPressed = true;

    Serial.println(
      "BUTTON PRESSED"
    );
  }

  if (
    !pressed &&
    buttonWasPressed
  ) {

    buttonWasPressed = false;

    Serial.println(
      "BUTTON RELEASED"
    );

    // ---------------------------------------------
    // Acknowledge automatic SOS
    // ---------------------------------------------

    if (automaticSOS) {

      stopAutomaticSOS();

      if (criticalCondition()) {

        acknowledgedCurrentEmergency = true;

        Serial.println(
          "Current emergency acknowledged."
        );

        Serial.println(
          "SOS will NOT restart until condition clears."
        );
      }

      return;
    }

    // ---------------------------------------------
    // Manual SOS
    // ---------------------------------------------

    if (!criticalCondition()) {

      transmitManualSOS();

    } else {

      Serial.println(
        "Button ignored: critical condition active."
      );
    }
  }
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();

  Serial.println(
    "================================"
  );

  Serial.println(
    "       KAVACHAM NODE 1"
  );

  Serial.println(
    "================================"
  );

  pinMode(
    BUTTON_PIN,
    INPUT_PULLUP
  );

  pinMode(
    BUZZER_PIN,
    OUTPUT
  );

  digitalWrite(
    BUZZER_PIN,
    LOW
  );

  pinMode(
    MQ6_AO,
    INPUT
  );

  pinMode(
    MQ6_DO,
    INPUT
  );

  initMPU6500();

  NimBLEDevice::init(
    "KAVACHAM"
  );

  advertising =
      NimBLEDevice::getAdvertising();

  Serial.println(
    "BLE initialized"
  );

  Serial.println(
    "Button GPIO: 23"
  );

  Serial.println(
    "Gas threshold: 800"
  );

  Serial.println(
    "Temperature threshold: 70 C"
  );

  Serial.println();

  Serial.println(
    "NODE 1 READY"
  );
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  // Button is checked continuously
  handleButton();

  // ---------------------------------------------
  // FAST IMU / FALL DETECTION
  // ---------------------------------------------

  updateFallDetection();

  // ---------------------------------------------
  // Stop manual SOS burst
  // ---------------------------------------------

  if (
    manualTransmitUntil != 0 &&
    millis() >= manualTransmitUntil
  ) {

    advertising->stop();

    manualTransmitUntil = 0;

    Serial.println(
      "Manual SOS BLE burst finished."
    );
  }

  // ---------------------------------------------
  // GAS + TEMPERATURE
  // ---------------------------------------------

  if (
    millis() - lastSensorRead >=
    SENSOR_INTERVAL_MS
  ) {

    lastSensorRead = millis();

    checkSafety();

    bool criticalNow =
        criticalCondition();

    // -------------------------------------------
    // Emergency condition cleared
    // -------------------------------------------

    if (!criticalNow) {

      acknowledgedCurrentEmergency =
          false;
    }

    // -------------------------------------------
    // SAFE -> UNSAFE transition
    // -------------------------------------------

    if (
      criticalNow &&
      !previousCriticalState &&
      !acknowledgedCurrentEmergency &&
      !automaticSOS
    ) {

      startAutomaticSOS();
    }

    previousCriticalState =
        criticalNow;
  }

  // ---------------------------------------------
  // CONTINUOUS AUTOMATIC SOS
  // ---------------------------------------------

  if (automaticSOS) {

    digitalWrite(
      BUZZER_PIN,
      HIGH
    );

    if (
      millis() - lastSOSTransmit >=
      SOS_INTERVAL_MS
    ) {

      lastSOSTransmit =
          millis();

      transmitEmergencyPacket();
    }
  }

  delay(5);
}

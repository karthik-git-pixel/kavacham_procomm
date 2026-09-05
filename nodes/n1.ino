// ============================================================
// KAVACHAM - NODE 1
// ============================================================
// Node 1 responsibilities:
//   - MQ-6 Gas
//   - DHT11 Temperature
//   - MPU6050 Fall Detection
//   - Manual SOS Button
//   - Buzzer
//   - BLE Emergency Transmission
//
// BLE PACKET: 7 BYTES
//   Byte 0 = 0xCA protocol
//   Byte 1 = source node ID
//   Byte 2 = status bits
//   Byte 3 = sequence
//   Byte 4 = gas value
//   Byte 5 = temperature
//   Byte 6 = node type
//
// STATUS BITS:
//   bit 0 = gas unsafe
//   bit 1 = temperature unsafe
//   bit 2 = fall unsafe
//   bit 3 = manual SOS
//
// IMPORTANT:
// This version keeps the established safety/SOS/packet logic.
// Only the normal sensor Serial display is formatted for demo.
// ============================================================


#include <Arduino.h>
#include <Wire.h>
#include <NimBLEDevice.h>


// ============================================================
// PIN CONFIGURATION
// ============================================================

#define MQ6_PIN       34
#define DHT_PIN       4
#define BUTTON_PIN    23
#define BUZZER_PIN    5

#define MPU_SDA       21
#define MPU_SCL       22


// ============================================================
// NODE / BLE CONFIGURATION
// ============================================================

#define NODE_ID       1
#define NODE_TYPE     1

#define KAVACHAM_PROTOCOL 0xCA
#define PACKET_SIZE       7

#define BLE_NAME "KAVACHAM"


// ============================================================
// SAFETY THRESHOLDS
// ============================================================

#define GAS_THRESHOLD       800
#define TEMP_THRESHOLD      70.0

// If MQ-6 is physically removed, analog input can float.
// These are the established demo heuristics.
#define GAS_DISCONNECTED_LOW   50
#define GAS_DISCONNECTED_HIGH  4090


// ============================================================
// FALL DETECTION
// ============================================================

#define IMU_INTERVAL_MS      10

#define FREE_FALL_THRESHOLD  0.65
#define IMPACT_THRESHOLD     2.0
#define GYRO_THRESHOLD       180.0

#define FALL_WINDOW_MS       1000
#define FALL_COOLDOWN_MS     3000


// ============================================================
// TIMING
// ============================================================

#define SAFETY_CHECK_INTERVAL_MS  2000

#define BUTTON_CHECK_INTERVAL_MS  5

#define AUTO_SOS_INTERVAL_MS      500

#define MANUAL_SOS_BURST_MS       700

#define SOS_COOLDOWN_MS           3000


// ============================================================
// MPU6050
// ============================================================

#define MPU6050_ADDRESS 0x68

float accelX = 0;
float accelY = 0;
float accelZ = 0;

float gyroX = 0;
float gyroY = 0;
float gyroZ = 0;

float accelMagnitude = 0;
float gyroMagnitude = 0;


// ============================================================
// SENSOR VALUES
// ============================================================

int gasValue = 0;

float temperature = 0.0;

bool gasUnsafe = false;
bool tempUnsafe = false;
bool fallDetected = false;

bool gasSensorDisconnected = false;


// ============================================================
// SAFETY STATE
// ============================================================

bool criticalState = false;

bool previousCriticalState = false;

bool automaticSOS = false;

bool manualSOS = false;

bool acknowledgedCurrentEmergency = false;


// ============================================================
// BUTTON STATE
// ============================================================

bool buttonLastState = HIGH;
bool buttonPressed = false;

unsigned long buttonPressStart = 0;

unsigned long lastButtonCheck = 0;


// ============================================================
// SOS TIMING
// ============================================================

unsigned long lastSOSPacketTime = 0;

unsigned long manualSOSStartTime = 0;

unsigned long sosCooldownStart = 0;

bool sosCooldownActive = false;


// ============================================================
// FALL TIMING
// ============================================================

bool freeFallDetected = false;

unsigned long freeFallTime = 0;

unsigned long lastFallTime = 0;

unsigned long lastIMURead = 0;


// ============================================================
// SAFETY TIMING
// ============================================================

unsigned long lastSafetyCheck = 0;


// ============================================================
// PACKET
// ============================================================

uint8_t packet[PACKET_SIZE];

uint8_t sequenceNumber = 0;


// ============================================================
// BLE
// ============================================================

NimBLEAdvertising* advertising = nullptr;


// ============================================================
// DHT11
// ============================================================

bool readDHT11(float &temp)
{
  uint8_t data[5] = {0, 0, 0, 0, 0};

  pinMode(DHT_PIN, OUTPUT);

  digitalWrite(DHT_PIN, LOW);

  delay(18);

  digitalWrite(DHT_PIN, HIGH);

  delayMicroseconds(30);

  pinMode(DHT_PIN, INPUT_PULLUP);

  unsigned long timeout = micros();

  while (digitalRead(DHT_PIN) == HIGH)
  {
    if (micros() - timeout > 100)
      return false;
  }

  timeout = micros();

  while (digitalRead(DHT_PIN) == LOW)
  {
    if (micros() - timeout > 100)
      return false;
  }

  timeout = micros();

  while (digitalRead(DHT_PIN) == HIGH)
  {
    if (micros() - timeout > 100)
      return false;
  }

  for (int i = 0; i < 40; i++)
  {
    timeout = micros();

    while (digitalRead(DHT_PIN) == LOW)
    {
      if (micros() - timeout > 100)
        return false;
    }

    unsigned long start = micros();

    timeout = micros();

    while (digitalRead(DHT_PIN) == HIGH)
    {
      if (micros() - timeout > 150)
        return false;
    }

    unsigned long duration = micros() - start;

    data[i / 8] <<= 1;

    if (duration > 40)
      data[i / 8] |= 1;
  }

  uint8_t checksum =
      data[0] +
      data[1] +
      data[2] +
      data[3];

  if (checksum != data[4])
    return false;

  temp = data[2];

  return true;
}


// ============================================================
// MPU6050 WRITE
// ============================================================

void mpuWrite(uint8_t reg, uint8_t value)
{
  Wire.beginTransmission(MPU6050_ADDRESS);

  Wire.write(reg);
  Wire.write(value);

  Wire.endTransmission();
}


// ============================================================
// MPU6050 READ
// ============================================================

bool readMPU6050()
{
  Wire.beginTransmission(MPU6050_ADDRESS);

  Wire.write(0x3B);

  if (Wire.endTransmission(false) != 0)
    return false;

  Wire.requestFrom(MPU6050_ADDRESS, 14);

  if (Wire.available() < 14)
    return false;

  int16_t ax = (Wire.read() << 8) | Wire.read();
  int16_t ay = (Wire.read() << 8) | Wire.read();
  int16_t az = (Wire.read() << 8) | Wire.read();

  Wire.read();
  Wire.read();

  int16_t gx = (Wire.read() << 8) | Wire.read();
  int16_t gy = (Wire.read() << 8) | Wire.read();
  int16_t gz = (Wire.read() << 8) | Wire.read();

  accelX = (float)ax / 16384.0;
  accelY = (float)ay / 16384.0;
  accelZ = (float)az / 16384.0;

  gyroX = (float)gx / 131.0;
  gyroY = (float)gy / 131.0;
  gyroZ = (float)gz / 131.0;

  accelMagnitude =
      sqrt(
        accelX * accelX +
        accelY * accelY +
        accelZ * accelZ
      );

  gyroMagnitude =
      sqrt(
        gyroX * gyroX +
        gyroY * gyroY +
        gyroZ * gyroZ
      );

  return true;
}


// ============================================================
// FALL DETECTION
// ============================================================

void updateFallDetection()
{
  if (millis() - lastIMURead < IMU_INTERVAL_MS)
    return;

  lastIMURead = millis();

  if (!readMPU6050())
    return;

  unsigned long now = millis();

  // ----------------------------------------------------------
  // FALL COOLDOWN
  // ----------------------------------------------------------

  if (now - lastFallTime < FALL_COOLDOWN_MS)
    return;


  // ----------------------------------------------------------
  // FREE FALL
  // ----------------------------------------------------------

  if (accelMagnitude < FREE_FALL_THRESHOLD)
  {
    freeFallDetected = true;

    freeFallTime = now;
  }


  // ----------------------------------------------------------
  // IMPACT AFTER FREE FALL
  // ----------------------------------------------------------

  if (freeFallDetected)
  {
    if (now - freeFallTime <= FALL_WINDOW_MS)
    {
      if (
        accelMagnitude >= IMPACT_THRESHOLD ||
        gyroMagnitude >= GYRO_THRESHOLD
      )
      {
        fallDetected = true;

        lastFallTime = now;

        freeFallDetected = false;

        Serial.println();
        Serial.println("!!! FALL DETECTED !!!");
      }
    }
    else
    {
      freeFallDetected = false;
    }
  }
}


// ============================================================
// BUILD BLE PACKET
// ============================================================

void buildPacket()
{
  uint8_t status = 0;

  if (gasUnsafe)
    status |= 0x01;

  if (tempUnsafe)
    status |= 0x02;

  if (fallDetected)
    status |= 0x04;

  if (manualSOS)
    status |= 0x08;


  packet[0] = KAVACHAM_PROTOCOL;

  packet[1] = NODE_ID;

  packet[2] = status;

  packet[3] = sequenceNumber++;

  packet[4] = (uint8_t)gasValue;

  packet[5] = (uint8_t)temperature;

  packet[6] = NODE_TYPE;
}


// ============================================================
// BLE ADVERTISING
// ============================================================

void startBLEAdvertising()
{
  if (!advertising)
    return;

  advertising->stop();

  advertising->clearData();

  NimBLEAdvertisementData advertisement;

  advertisement.setFlags(0x06);

  advertisement.setName(BLE_NAME);

  std::string data(
    (char*)packet,
    sizeof(packet)
  );

  advertisement.setManufacturerData(data);

  advertising->setAdvertisementData(advertisement);

  advertising->start();
}


// ============================================================
// SEND BLE PACKET
// ============================================================

void sendBLEPacket()
{
  buildPacket();

  startBLEAdvertising();
}


// ============================================================
// START AUTOMATIC SOS
// ============================================================

void startAutomaticSOS()
{
  if (automaticSOS)
    return;

  automaticSOS = true;

  acknowledgedCurrentEmergency = false;

  digitalWrite(BUZZER_PIN, HIGH);

  lastSOSPacketTime = 0;

  Serial.println();
  Serial.println("========================================");
  Serial.println("!!! AUTOMATIC SOS ACTIVATED !!!");
  Serial.println("========================================");
}


// ============================================================
// STOP AUTOMATIC SOS
// ============================================================

void stopAutomaticSOS()
{
  automaticSOS = false;

  digitalWrite(BUZZER_PIN, LOW);

  Serial.println();
  Serial.println("========================================");
  Serial.println("!!! AUTOMATIC SOS ACKNOWLEDGED !!!");
  Serial.println("========================================");

  startSOSCooldown();
}


// ============================================================
// START SOS COOLDOWN
// ============================================================

void startSOSCooldown()
{
  sosCooldownActive = true;

  sosCooldownStart = millis();

  automaticSOS = false;

  manualSOS = false;

  digitalWrite(BUZZER_PIN, LOW);
}


// ============================================================
// UPDATE SOS COOLDOWN
// ============================================================

void updateSOSCooldown()
{
  if (!sosCooldownActive)
    return;

  if (millis() - sosCooldownStart >= SOS_COOLDOWN_MS)
  {
    sosCooldownActive = false;

    acknowledgedCurrentEmergency = false;

    previousCriticalState = false;

    criticalState = false;

    fallDetected = false;

    manualSOS = false;

    Serial.println();
    Serial.println("SOS COOLDOWN COMPLETE");
    Serial.println("SYSTEM READY");
  }
}


// ============================================================
// MANUAL SOS
// ============================================================

void sendManualSOS()
{
  if (sosCooldownActive)
    return;

  if (automaticSOS)
    return;

  manualSOS = true;

  manualSOSStartTime = millis();

  Serial.println();
  Serial.println("========================================");
  Serial.println("!!! MANUAL SOS !!!");
  Serial.println("========================================");

  // One packet burst for manual SOS.
  sendBLEPacket();
}


// ============================================================
// UPDATE MANUAL SOS
// ============================================================

void updateManualSOS()
{
  if (!manualSOS)
    return;

  if (millis() - manualSOSStartTime < MANUAL_SOS_BURST_MS)
  {
    if (millis() - lastSOSPacketTime >= 100)
    {
      lastSOSPacketTime = millis();

      sendBLEPacket();
    }
  }
  else
  {
    manualSOS = false;
  }
}


// ============================================================
// BUTTON
// ============================================================

void updateButton()
{
  if (millis() - lastButtonCheck < BUTTON_CHECK_INTERVAL_MS)
    return;

  lastButtonCheck = millis();

  bool currentState = digitalRead(BUTTON_PIN);


  // ----------------------------------------------------------
  // BUTTON PRESSED
  // ----------------------------------------------------------

  if (
    currentState == LOW &&
    buttonLastState == HIGH
  )
  {
    buttonPressed = true;

    buttonPressStart = millis();
  }


  // ----------------------------------------------------------
  // BUTTON RELEASED
  // ----------------------------------------------------------

  if (
    currentState == HIGH &&
    buttonLastState == LOW
  )
  {
    if (buttonPressed)
    {
      buttonPressed = false;

      // One complete press + release = one action.
      if (!sosCooldownActive)
      {
        // If automatic SOS is active,
        // this button press acknowledges it.
        if (automaticSOS)
        {
          stopAutomaticSOS();
        }

        // Manual SOS only if system is SAFE.
        else if (!criticalState)
        {
          sendManualSOS();
        }
      }
    }
  }

  buttonLastState = currentState;
}


// ============================================================
// READ ALL SENSORS
// ============================================================

void readSensors()
{
  // ----------------------------------------------------------
  // MQ-6
  // ----------------------------------------------------------

  gasValue = analogRead(MQ6_PIN);


  // ----------------------------------------------------------
  // MQ-6 DISCONNECTED DEMO DETECTION
  // ----------------------------------------------------------

  gasSensorDisconnected =
      (
        gasValue <= GAS_DISCONNECTED_LOW ||
        gasValue >= GAS_DISCONNECTED_HIGH
      );


  // ----------------------------------------------------------
  // GAS SAFETY
  // ----------------------------------------------------------

  if (gasSensorDisconnected)
  {
    gasUnsafe = true;
  }
  else
  {
    gasUnsafe = (gasValue > GAS_THRESHOLD);
  }


  // ----------------------------------------------------------
  // DHT11
  // ----------------------------------------------------------

  float newTemperature;

  if (readDHT11(newTemperature))
  {
    temperature = newTemperature;
  }


  // ----------------------------------------------------------
  // TEMPERATURE SAFETY
  // ----------------------------------------------------------

  tempUnsafe = (temperature > TEMP_THRESHOLD);
}


// ============================================================
// SAFETY DECISION
// ============================================================

void checkSafety()
{
  readSensors();

  criticalState =
      gasUnsafe ||
      tempUnsafe ||
      fallDetected;


  // ----------------------------------------------------------
  // SAFE -> UNSAFE TRANSITION
  // ----------------------------------------------------------

  if (
    criticalState &&
    !previousCriticalState &&
    !acknowledgedCurrentEmergency &&
    !sosCooldownActive
  )
  {
    startAutomaticSOS();
  }


  // ----------------------------------------------------------
  // IF AUTOMATIC SOS IS ACTIVE
  // ----------------------------------------------------------

  if (automaticSOS)
  {
    digitalWrite(BUZZER_PIN, HIGH);

    if (millis() - lastSOSPacketTime >= AUTO_SOS_INTERVAL_MS)
    {
      lastSOSPacketTime = millis();

      sendBLEPacket();
    }
  }


  // ----------------------------------------------------------
  // UPDATE PREVIOUS STATE
  // ----------------------------------------------------------

  previousCriticalState = criticalState;


  // ----------------------------------------------------------
  // NORMAL SENSOR DISPLAY
  // ----------------------------------------------------------

  Serial.println();
  Serial.println("============================================================");
  Serial.println("                 KAVACHAM - NODE 1");
  Serial.println("                 LIVE SENSOR STATUS");
  Serial.println("============================================================");

  Serial.print("Gas        : ");
  Serial.print(gasValue);
  Serial.print(" ADC    | Threshold: > ");
  Serial.print(GAS_THRESHOLD);
  Serial.print("    | Status: ");

  if (gasUnsafe)
    Serial.println("UNSAFE");
  else
    Serial.println("SAFE");


  Serial.print("Temperature: ");
  Serial.print(temperature, 1);
  Serial.print(" C      | Threshold: > ");
  Serial.print(TEMP_THRESHOLD, 1);
  Serial.print(" C  | Status: ");

  if (tempUnsafe)
    Serial.println("UNSAFE");
  else
    Serial.println("SAFE");


  Serial.print("Fall       : ");
  Serial.print(fallDetected ? "DETECTED" : "NONE");
  Serial.print("      | Detection: Free-fall < ");
  Serial.print(FREE_FALL_THRESHOLD, 2);
  Serial.print(" g + Impact >= ");
  Serial.print(IMPACT_THRESHOLD, 2);
  Serial.println(" g");


  Serial.print("Gyroscope  : ");
  Serial.print(gyroMagnitude, 1);
  Serial.print(" deg/s | Threshold: >= ");
  Serial.print(GYRO_THRESHOLD, 1);
  Serial.println(" deg/s");


  Serial.print("Accel      : ");
  Serial.print(accelMagnitude, 2);
  Serial.println(" g");


  Serial.print("Gas Sensor : ");

  if (gasSensorDisconnected)
    Serial.println("DISCONNECTED / DEMO GAS TRIGGER");

  else
    Serial.println("CONNECTED");


  Serial.println("------------------------------------------------------------");

  Serial.print("Overall    : ");

  if (criticalState)
    Serial.println("!!! UNSAFE !!!");
  else
    Serial.println("SAFE");


  Serial.print("Auto SOS   : ");
  Serial.println(automaticSOS ? "ACTIVE" : "OFF");

  Serial.print("Manual SOS : ");
  Serial.println(manualSOS ? "ACTIVE" : "OFF");

  Serial.print("Cooldown   : ");
  Serial.println(sosCooldownActive ? "ACTIVE" : "READY");

  Serial.println("============================================================");
}


// ============================================================
// SETUP
// ============================================================

void setup()
{
  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("       KAVACHAM NODE 1 STARTING");
  Serial.println("========================================");


  // ----------------------------------------------------------
  // GPIO
  // ----------------------------------------------------------

  pinMode(MQ6_PIN, INPUT);

  pinMode(DHT_PIN, INPUT_PULLUP);

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);


  // ----------------------------------------------------------
  // ADC
  // ----------------------------------------------------------

  analogReadResolution(12);


  // ----------------------------------------------------------
  // I2C
  // ----------------------------------------------------------

  Wire.begin(MPU_SDA, MPU_SCL);

  delay(100);


  // ----------------------------------------------------------
  // MPU6050
  // ----------------------------------------------------------

  mpuWrite(0x6B, 0x00);

  // Accelerometer ±2g
  mpuWrite(0x1C, 0x00);

  // Gyroscope ±250 deg/s
  mpuWrite(0x1B, 0x00);


  // ----------------------------------------------------------
  // BLE
  // ----------------------------------------------------------

  NimBLEDevice::init(BLE_NAME);

  advertising = NimBLEDevice::getAdvertising();


  // Initial packet
  gasValue = analogRead(MQ6_PIN);

  float initialTemperature;

  if (readDHT11(initialTemperature))
  {
    temperature = initialTemperature;
  }

  gasSensorDisconnected =
      (
        gasValue <= GAS_DISCONNECTED_LOW ||
        gasValue >= GAS_DISCONNECTED_HIGH
      );

  gasUnsafe =
      gasSensorDisconnected ||
      (gasValue > GAS_THRESHOLD);

  tempUnsafe = (temperature > TEMP_THRESHOLD);

  buildPacket();

  startBLEAdvertising();


  Serial.println("BLE NAME      : KAVACHAM");
  Serial.println("NODE ID       : 1");
  Serial.println("PROTOCOL      : 0xCA");
  Serial.println("PACKET SIZE   : 7 BYTES");
  Serial.println("SYSTEM READY");
  Serial.println();
}


// ============================================================
// LOOP
// ============================================================

void loop()
{
  // ----------------------------------------------------------
  // FAST FALL DETECTION
  // ----------------------------------------------------------

  updateFallDetection();


  // ----------------------------------------------------------
  // BUTTON
  // ----------------------------------------------------------

  updateButton();


  // ----------------------------------------------------------
  // MANUAL SOS
  // ----------------------------------------------------------

  updateManualSOS();


  // ----------------------------------------------------------
  // SOS COOLDOWN
  // ----------------------------------------------------------

  updateSOSCooldown();


  // ----------------------------------------------------------
  // SAFETY CHECK EVERY 2 SECONDS
  // ----------------------------------------------------------

  if (millis() - lastSafetyCheck >= SAFETY_CHECK_INTERVAL_MS)
  {
    lastSafetyCheck = millis();

    checkSafety();
  }


  // ----------------------------------------------------------
  // KEEP AUTOMATIC SOS TRANSMITTING
  // ----------------------------------------------------------

  if (automaticSOS)
  {
    digitalWrite(BUZZER_PIN, HIGH);

    if (millis() - lastSOSPacketTime >= AUTO_SOS_INTERVAL_MS)
    {
      lastSOSPacketTime = millis();

      sendBLEPacket();
    }
  }


  delay(1);
}


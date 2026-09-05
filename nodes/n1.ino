#include <NimBLEDevice.h>
#include <DHT.h>

// =========================
// PINS
// =========================
#define MQ6_PIN     34
#define DHT_PIN     4
#define BUTTON_PIN  23
#define BUZZER_PIN  5

#define DHT_TYPE DHT11

// =========================
// BLE
// =========================
#define NODE_NAME "KAVACHAM_N1"

NimBLEAdvertising *advertising;

// =========================
// DHT
// =========================
DHT dht(DHT_PIN, DHT_TYPE);

// =========================
// STATE
// =========================
bool sosActive = false;

bool lastButtonState = HIGH;
unsigned long lastButtonTime = 0;

const unsigned long DEBOUNCE_TIME = 250;
const unsigned long TRANSMIT_INTERVAL = 1000;

unsigned long lastTransmitTime = 0;


// =====================================================
// START / UPDATE BLE PACKET
// =====================================================
void transmitSensorData() {

  // -------------------------
  // READ SENSORS
  // -------------------------
  uint16_t gasValue = analogRead(MQ6_PIN);

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // If DHT fails, use 0
  if (isnan(temperature)) {
    temperature = 0;
  }

  if (isnan(humidity)) {
    humidity = 0;
  }

  // Convert to integers
  uint8_t tempValue = constrain((int)temperature, 0, 255);
  uint8_t humValue  = constrain((int)humidity, 0, 100);


  // =================================================
  // CREATE 5-BYTE PACKET
  // =================================================
  //
  // BYTE 0 = Node ID
  // BYTE 1 = Gas HIGH
  // BYTE 2 = Gas LOW
  // BYTE 3 = Temperature
  // BYTE 4 = Humidity
  //
  // =================================================

  uint8_t packet[5];

  packet[0] = 1;                         // NODE 1
  packet[1] = (gasValue >> 8) & 0xFF;   // Gas high byte
  packet[2] = gasValue & 0xFF;          // Gas low byte
  packet[3] = tempValue;                // Temperature
  packet[4] = humValue;                 // Humidity


  // =================================================
  // CONVERT TO STRING WITH EXPLICIT LENGTH
  // =================================================
  //
  // IMPORTANT:
  // Do NOT use packet.c_str()
  // because this is binary data.
  //
  std::string manufacturerData(
    (char*)packet,
    sizeof(packet)
  );


  // =================================================
  // UPDATE BLE ADVERTISEMENT
  // =================================================

  advertising->stop();
  advertising->clearData();

  NimBLEAdvertisementData data;

  data.setFlags(0x06);

  // Identify KAVACHAM
  data.setName("KAVACHAM");

  // Actual sensor packet
  data.setManufacturerData(manufacturerData);

  advertising->setAdvertisementData(data);

  advertising->start();


  // =================================================
  // SERIAL DEBUG
  // =================================================

  Serial.println();
  Serial.println("========== TRANSMITTING ==========");

  Serial.print("Node: ");
  Serial.println(packet[0]);

  Serial.print("Gas: ");
  Serial.println(gasValue);

  Serial.print("Temperature: ");
  Serial.print(tempValue);
  Serial.println(" C");

  Serial.print("Humidity: ");
  Serial.print(humValue);
  Serial.println(" %");

  Serial.println("BLE PACKET SENT");
  Serial.println("==================================");
}


// =====================================================
// START SOS
// =====================================================
void startSOS() {

  sosActive = true;

  digitalWrite(BUZZER_PIN, HIGH);

  Serial.println();
  Serial.println("==============================");
  Serial.println("SOS ACTIVATED");
  Serial.println("NODE 1 TRANSMITTING");
  Serial.println("==============================");

  // Immediately transmit first packet
  transmitSensorData();

  lastTransmitTime = millis();
}


// =====================================================
// STOP SOS
// =====================================================
void stopSOS() {

  sosActive = false;

  digitalWrite(BUZZER_PIN, LOW);

  advertising->stop();

  Serial.println();
  Serial.println("==============================");
  Serial.println("SOS STOPPED");
  Serial.println("NODE 1 NOT TRANSMITTING");
  Serial.println("==============================");
}


// =====================================================
// SETUP
// =====================================================
void setup() {

  Serial.begin(115200);

  delay(1000);

  // Pins
  pinMode(MQ6_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);

  // DHT
  dht.begin();

  // BLE
  NimBLEDevice::init(NODE_NAME);

  advertising = NimBLEDevice::getAdvertising();


  Serial.println();
  Serial.println("================================");
  Serial.println("       KAVACHAM NODE 1");
  Serial.println("       BLE TRANSMITTER");
  Serial.println("================================");

  Serial.println("Press button -> START SOS");
  Serial.println("Press button -> STOP SOS");
}


// =====================================================
// LOOP
// =====================================================
void loop() {

  // =================================================
  // BUTTON EDGE DETECTION
  // =================================================

  bool buttonState = digitalRead(BUTTON_PIN);

  if (lastButtonState == HIGH &&
      buttonState == LOW &&
      millis() - lastButtonTime > DEBOUNCE_TIME) {

    lastButtonTime = millis();

    if (!sosActive) {

      startSOS();

    } else {

      stopSOS();
    }
  }

  lastButtonState = buttonState;


  // =================================================
  // CONTINUOUS TRANSMISSION
  // =================================================

  if (sosActive &&
      millis() - lastTransmitTime >= TRANSMIT_INTERVAL) {

    lastTransmitTime = millis();

    transmitSensorData();
  }

  delay(10);
}

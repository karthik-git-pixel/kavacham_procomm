#include <WiFi.h>
#include <PubSubClient.h>
#include <NimBLEDevice.h>

// =====================================================
// KAVACHAM GATEWAY
// NODE 1 -> NODE 2 -> GATEWAY -> MQTT
// =====================================================

// ---------------- WIFI ----------------

const char* WIFI_SSID = "Karthik";
const char* WIFI_PASSWORD = "12345678";

// ---------------- MQTT ----------------

const char* MQTT_BROKER = "192.168.146.22";
const int MQTT_PORT = 1883;

const char* MQTT_TOPIC = "mine/test";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

NimBLEScan* bleScan;


// =====================================================
// KAVACHAM PACKET
// =====================================================
//
// Byte 0 = Protocol       0xCA
// Byte 1 = Source Node ID
// Byte 2 = Status
//          bit 0 = GAS UNSAFE
//          bit 1 = TEMP UNSAFE
//          bit 2 = FALL
//          bit 3 = MANUAL SOS
// Byte 3 = Sequence
// Byte 4 = Gas
// Byte 5 = Temperature
// Byte 6 = Node Type
//
// =====================================================

#define PACKET_SIZE 7
#define KAVACHAM_PROTOCOL 0xCA


// =====================================================
// STATUS BITS
// =====================================================

#define GAS_UNSAFE_BIT       0x01
#define TEMP_UNSAFE_BIT      0x02
#define FALL_UNSAFE_BIT      0x04
#define MANUAL_SOS_BIT       0x08


// =====================================================
// MESSAGE TYPES
// =====================================================

const char* getMessageType(uint8_t status)
{
  bool gas    = status & GAS_UNSAFE_BIT;
  bool temp   = status & TEMP_UNSAFE_BIT;
  bool fall   = status & FALL_UNSAFE_BIT;
  bool manual = status & MANUAL_SOS_BIT;

  if (manual)
    return "MANUAL_SOS";

  if (fall)
    return "CRITICAL_FALL";

  if (gas)
    return "GAS_THRESHOLD_EXCEEDED";

  if (temp)
    return "TEMPERATURE_EXCEEDED";

  return "TELEMETRY";
}


// =====================================================
// WIFI
// =====================================================

void connectWiFi()
{
  Serial.println();
  Serial.println("================================");
  Serial.println("        WIFI DEBUG START");
  Serial.println("================================");

  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);

  Serial.print("Password length: ");
  Serial.println(strlen(WIFI_PASSWORD));

  // Set WiFi mode
  WiFi.mode(WIFI_STA);

  Serial.println("WiFi mode set to STA");

  // Disconnect previous connection
  WiFi.disconnect(true);
  delay(1000);

  Serial.println("Previous WiFi connection cleared");

  // Start connection
  Serial.println();
  Serial.println("Attempting WiFi connection...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 40)
  {
    delay(500);

    Serial.print("Attempt ");
    Serial.print(attempts + 1);
    Serial.print(" | Status = ");
    Serial.println(WiFi.status());

    attempts++;
  }

  Serial.println();

  // Check result
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("================================");
    Serial.println("       WIFI CONNECTED!");
    Serial.println("================================");

    Serial.print("SSID       : ");
    Serial.println(WiFi.SSID());

    Serial.print("IP Address : ");
    Serial.println(WiFi.localIP());

    Serial.print("Gateway    : ");
    Serial.println(WiFi.gatewayIP());

    Serial.print("Subnet     : ");
    Serial.println(WiFi.subnetMask());

    Serial.print("RSSI       : ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");

    Serial.println("================================");
  }
  else
  {
    Serial.println("================================");
    Serial.println("     WIFI CONNECTION FAILED");
    Serial.println("================================");

    Serial.print("Final status = ");
    Serial.println(WiFi.status());

    Serial.println();
    Serial.println("Possible reasons:");
    Serial.println("1. Hotspot is using 5 GHz");
    Serial.println("2. Wrong SSID");
    Serial.println("3. Wrong password");
    Serial.println("4. Hotspot is not active");
    Serial.println("5. ESP32 is too far from hotspot");
    Serial.println("================================");
  }
}

// =====================================================
// MQTT
// =====================================================

void connectMQTT()
{
  while (!mqttClient.connected())
  {
    Serial.print("Connecting to MQTT... ");

    String clientID =
      "KAVACHAM-GATEWAY-" +
      String(
        (uint32_t)ESP.getEfuseMac(),
        HEX
      );

    if (mqttClient.connect(clientID.c_str()))
    {
      Serial.println("CONNECTED");

      mqttClient.publish(
        MQTT_TOPIC,
        "{\"gateway\":\"KAVACHAM_GATEWAY\",\"status\":\"online\"}"
      );
    }
    else
    {
      Serial.print("FAILED, state = ");
      Serial.println(mqttClient.state());

      delay(2000);
    }
  }
}


// =====================================================
// LAST PACKET
// Prevent processing exact duplicate packets
// =====================================================

uint8_t lastSource = 255;
uint8_t lastSequence = 255;


// =====================================================
// BLE CALLBACK
// =====================================================

class ScanCallbacks : public NimBLEScanCallbacks
{
  void onResult(
    const NimBLEAdvertisedDevice* device
  ) override
  {

    // -------------------------------------------------
    // Check device name
    // -------------------------------------------------

    if (!device->haveName())
      return;

    String name =
      device->getName().c_str();

    if (name != "KAVACHAM")
      return;


    // -------------------------------------------------
    // Check manufacturer data
    // -------------------------------------------------

    if (!device->haveManufacturerData())
      return;

    std::string data =
      device->getManufacturerData();


    // -------------------------------------------------
    // Must be exactly 7 bytes
    // -------------------------------------------------

    if (data.length() != PACKET_SIZE)
      return;


    uint8_t packet[PACKET_SIZE];

    memcpy(
      packet,
      data.data(),
      PACKET_SIZE
    );


    // -------------------------------------------------
    // Check protocol byte
    // -------------------------------------------------

    if (packet[0] != KAVACHAM_PROTOCOL)
      return;


    // -------------------------------------------------
    // Decode
    // -------------------------------------------------

    uint8_t sourceNode = packet[1];
    uint8_t status     = packet[2];
    uint8_t sequence   = packet[3];

    uint8_t gas =
      packet[4];

    uint8_t temperature =
      packet[5];

    uint8_t nodeType =
      packet[6];


    // -------------------------------------------------
    // Ignore exact duplicate
    // -------------------------------------------------

    if (
      sourceNode == lastSource &&
      sequence == lastSequence
    )
    {
      return;
    }

    lastSource = sourceNode;
    lastSequence = sequence;


    // -------------------------------------------------
    // Decode status
    // -------------------------------------------------

    bool gasUnsafe =
      status & GAS_UNSAFE_BIT;

    bool tempUnsafe =
      status & TEMP_UNSAFE_BIT;

    bool fallDetected =
      status & FALL_UNSAFE_BIT;

    bool manualSOS =
      status & MANUAL_SOS_BIT;


    const char* message =
      getMessageType(status);


    // -------------------------------------------------
    // RSSI
    // -------------------------------------------------

    int rssi =
      device->getRSSI();


    String address =
      device->getAddress().toString().c_str();


    // -------------------------------------------------
    // SERIAL DISPLAY
    // -------------------------------------------------

    Serial.println();
    Serial.println("================================");
    Serial.println("       KAVACHAM GATEWAY");
    Serial.println("================================");

    Serial.print("SOURCE NODE: ");
    Serial.println(sourceNode);

    Serial.print("MESSAGE: ");
    Serial.println(message);

    Serial.print("SEQUENCE: ");
    Serial.println(sequence);

    Serial.print("GAS: ");
    Serial.println(gas);

    Serial.print("TEMPERATURE: ");
    Serial.println(temperature);

    Serial.print("GAS UNSAFE: ");
    Serial.println(gasUnsafe ? "YES" : "NO");

    Serial.print("TEMP UNSAFE: ");
    Serial.println(tempUnsafe ? "YES" : "NO");

    Serial.print("FALL: ");
    Serial.println(fallDetected ? "YES" : "NO");

    Serial.print("MANUAL SOS: ");
    Serial.println(manualSOS ? "YES" : "NO");

    Serial.print("NODE TYPE: ");
    Serial.println(nodeType);

    Serial.print("RSSI: ");
    Serial.println(rssi);

    Serial.print("BLE ADDRESS: ");
    Serial.println(address);

    Serial.println("================================");


    // =================================================
    // CREATE MQTT JSON
    // =================================================

    String json = "{";


    // Node information

    json += "\"node\":";
    json += sourceNode;
    json += ",";

    json += "\"worker_id\":\"WSN-";
    json += sourceNode;
    json += "\",";


    // Message

    json += "\"message\":\"";
    json += message;
    json += "\",";


    // Sequence

    json += "\"sequence\":";
    json += sequence;
    json += ",";


    // Sensor values

    json += "\"gas\":";
    json += gas;
    json += ",";

    json += "\"temperature\":";
    json += temperature;
    json += ",";


    // Status

    json += "\"gas_unsafe\":";
    json += gasUnsafe ? "true" : "false";
    json += ",";

    json += "\"temperature_unsafe\":";
    json += tempUnsafe ? "true" : "false";
    json += ",";

    json += "\"fall\":";
    json += fallDetected ? "true" : "false";
    json += ",";

    json += "\"manual_sos\":";
    json += manualSOS ? "true" : "false";
    json += ",";


    // Node type

    json += "\"node_type\":";
    json += nodeType;
    json += ",";


    // BLE information

    json += "\"rssi\":";
    json += rssi;
    json += ",";

    json += "\"ble_address\":\"";
    json += address;
    json += "\",";


    // Gateway

    json += "\"gateway\":\"KAVACHAM_GATEWAY\"";


    json += "}";


    // =================================================
    // MQTT PUBLISH
    // =================================================

    if (mqttClient.connected())
    {
      if (
        mqttClient.publish(
          MQTT_TOPIC,
          json.c_str()
        )
      )
      {
        Serial.println();
        Serial.println(">>> MQTT PUBLISHED <<<");
        Serial.println(json);
      }
      else
      {
        Serial.println(">>> MQTT PUBLISH FAILED <<<");
      }
    }
  }
};


ScanCallbacks callbacks;


// =====================================================
// SETUP
// =====================================================

void setup()
{
  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("       KAVACHAM GATEWAY");
  Serial.println("================================");
  Serial.println(" NODE 1 -> NODE 2 -> GATEWAY");
  Serial.println(" BLE -> MQTT");
  Serial.println("================================");


  // ---------------------------------------------------
  // WiFi
  // ---------------------------------------------------

  connectWiFi();


  // ---------------------------------------------------
  // MQTT
  // ---------------------------------------------------

  mqttClient.setServer(
    MQTT_BROKER,
    MQTT_PORT
  );

  mqttClient.setBufferSize(512);

  connectMQTT();


  // ---------------------------------------------------
  // BLE
  // ---------------------------------------------------

  NimBLEDevice::init(
    "KAVACHAM_GATEWAY"
  );

  bleScan =
    NimBLEDevice::getScan();

  bleScan->setScanCallbacks(
    &callbacks
  );

  bleScan->setActiveScan(true);

  bleScan->setInterval(20);
  bleScan->setWindow(20);


  // Continuous BLE scan

  bleScan->start(
    0,
    false
  );


  Serial.println();
  Serial.println("BLE SCANNER ACTIVE");
  Serial.println("Waiting for Node 2...");
}


// =====================================================
// LOOP
// =====================================================

void loop()
{
  // ---------------------------------------------------
  // WiFi reconnect
  // ---------------------------------------------------

  if (WiFi.status() != WL_CONNECTED)
  {
    connectWiFi();
  }


  // ---------------------------------------------------
  // MQTT reconnect
  // ---------------------------------------------------

  if (!mqttClient.connected())
  {
    connectMQTT();
  }


  mqttClient.loop();


  delay(10);
}

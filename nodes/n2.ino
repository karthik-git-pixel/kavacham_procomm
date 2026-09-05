#include <NimBLEDevice.h>

#define NODE_NAME "KAVACHAM_N2"

NimBLEAdvertising *advertising;


// =====================================================
// RELAY RECEIVED PACKET
// =====================================================
void relayPacket(const std::string &receivedData) {

  advertising->stop();
  advertising->clearData();

  NimBLEAdvertisementData data;

  data.setFlags(0x06);

  data.setName("KAVACHAM");

  // SAME PACKET RECEIVED FROM NODE 1
  data.setManufacturerData(receivedData);

  advertising->setAdvertisementData(data);
  advertising->start();


  // =================================================
  // DECODE PACKET
  // =================================================

  const uint8_t *packet =
    (const uint8_t *)receivedData.data();

  uint8_t nodeID = packet[0];

  uint16_t gasValue =
    ((uint16_t)packet[1] << 8) |
    packet[2];

  uint8_t temperature = packet[3];
  uint8_t humidity = packet[4];


  Serial.println();
  Serial.println("================================");
  Serial.println("       PACKET RECEIVED");
  Serial.println("================================");

  Serial.print("ORIGINAL SOURCE: NODE ");
  Serial.println(nodeID);

  Serial.print("Gas: ");
  Serial.println(gasValue);

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.println("--------------------------------");
  Serial.println("RELAYING TO NODE 3...");
  Serial.println("--------------------------------");
}


// =====================================================
// SCANNER
// =====================================================
class ScanCallbacks : public NimBLEScanCallbacks {

  void onResult(
    const NimBLEAdvertisedDevice *device
  ) override {

    // Check name
    if (!device->haveName()) {
      return;
    }

    String name =
      device->getName().c_str();

    if (name != "KAVACHAM") {
      return;
    }

    // Check manufacturer data
    if (!device->haveManufacturerData()) {
      return;
    }

    std::string receivedData =
      device->getManufacturerData();

    // Packet must be 5 bytes
    if (receivedData.length() != 5) {
      return;
    }

    // Relay it
    relayPacket(receivedData);
  }
};

ScanCallbacks scanCallbacks;


// =====================================================
// SETUP
// =====================================================
void setup() {

  Serial.begin(115200);

  delay(1000);

  NimBLEDevice::init(NODE_NAME);

  advertising =
    NimBLEDevice::getAdvertising();


  // Start scanner
  NimBLEScan *scan =
    NimBLEDevice::getScan();

  scan->setScanCallbacks(&scanCallbacks);

  scan->setActiveScan(true);

  scan->setInterval(20);
  scan->setWindow(20);

  scan->start(0, false);


  Serial.println();
  Serial.println("================================");
  Serial.println("       KAVACHAM NODE 2");
  Serial.println("================================");
  Serial.println("BLE RECEIVER + RELAY");
  Serial.println();
  Serial.println("Waiting for Node 1...");
}


// =====================================================
// LOOP
// =====================================================
void loop() {

  // BLE scanner handles everything

}

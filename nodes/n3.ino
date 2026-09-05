#include <NimBLEDevice.h>

#define NODE_NAME "KAVACHAM_N3"

NimBLEAdvertising *advertising;

// =====================================================
// PACKET
// =====================================================
// 5 bytes:
// [0] Node ID
// [1] Gas HIGH
// [2] Gas LOW
// [3] Temperature
// [4] Humidity
// =====================================================


// =====================================================
// START BLE RELAY
// =====================================================
void relayPacket(const std::string &receivedData) {

  // Stop current advertisement
  advertising->stop();
  advertising->clearData();

  NimBLEAdvertisementData data;

  data.setFlags(0x06);

  // KAVACHAM identifier
  data.setName("KAVACHAM");

  // Put received packet back into advertisement
  data.setManufacturerData(receivedData);

  advertising->setAdvertisementData(data);
  advertising->start();


  // =================================================
  // DISPLAY DATA
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
  Serial.println("RELAYING TO GATEWAY...");
  Serial.println("--------------------------------");
}


// =====================================================
// SCAN CALLBACK
// =====================================================
class ScanCallbacks : public NimBLEScanCallbacks {

  void onResult(
    const NimBLEAdvertisedDevice *device
  ) override {

    // Must have name
    if (!device->haveName()) {
      return;
    }

    String name = device->getName().c_str();

    // Only KAVACHAM packets
    if (name != "KAVACHAM") {
      return;
    }

    // Must contain manufacturer data
    if (!device->haveManufacturerData()) {
      return;
    }

    std::string receivedData =
      device->getManufacturerData();

    // Must be exactly 5 bytes
    if (receivedData.length() != 5) {
      return;
    }

    // -----------------------------------------------
    // RELAY PACKET
    // -----------------------------------------------

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

  // Initialize BLE
  NimBLEDevice::init(NODE_NAME);

  // Advertising object
  advertising =
    NimBLEDevice::getAdvertising();


  // -----------------------------------------------
  // START SCANNING
  // -----------------------------------------------

  NimBLEScan *scan =
    NimBLEDevice::getScan();

  scan->setScanCallbacks(&scanCallbacks);

  scan->setActiveScan(true);

  scan->setInterval(20);
  scan->setWindow(20);

  // Continuous scan
  scan->start(0, false);


  Serial.println();
  Serial.println("================================");
  Serial.println("       KAVACHAM NODE 3");
  Serial.println("================================");
  Serial.println("BLE RECEIVER + RELAY");
  Serial.println();
  Serial.println("Waiting for Node 2...");
}


// =====================================================
// LOOP
// =====================================================
void loop() {

  // BLE scanning handled automatically

}

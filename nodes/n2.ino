#include <NimBLEDevice.h>

#define NODE_NAME "KAVACHAM_N2"


// =====================================================
// BLE SCAN CALLBACK
// =====================================================
class ScanCallbacks : public NimBLEScanCallbacks {

  void onResult(const NimBLEAdvertisedDevice *device) override {

    // -----------------------------------------------
    // Must have KAVACHAM name
    // -----------------------------------------------

    if (!device->haveName()) {
      return;
    }

    String name = device->getName().c_str();

    if (name != "KAVACHAM") {
      return;
    }


    // -----------------------------------------------
    // Must contain manufacturer data
    // -----------------------------------------------

    if (!device->haveManufacturerData()) {
      return;
    }


    std::string data = device->getManufacturerData();


    // -----------------------------------------------
    // We expect exactly 5 bytes
    // -----------------------------------------------

    if (data.length() != 5) {
      return;
    }


    // -----------------------------------------------
    // READ PACKET
    // -----------------------------------------------

    const uint8_t *packet =
      (const uint8_t *)data.data();


    // -----------------------------------------------
    // NODE ID
    // -----------------------------------------------

    uint8_t nodeID = packet[0];


    // -----------------------------------------------
    // GAS
    // -----------------------------------------------

    uint16_t gasValue =
      ((uint16_t)packet[1] << 8) |
      packet[2];


    // -----------------------------------------------
    // TEMPERATURE
    // -----------------------------------------------

    uint8_t temperature = packet[3];


    // -----------------------------------------------
    // HUMIDITY
    // -----------------------------------------------

    uint8_t humidity = packet[4];


    // =================================================
    // DISPLAY RECEIVED DATA
    // =================================================

    Serial.println();
    Serial.println("================================");
    Serial.println("       BLE PACKET RECEIVED");
    Serial.println("================================");

    Serial.print("SOURCE NODE: NODE ");
    Serial.println(nodeID);

    Serial.print("Gas: ");
    Serial.println(gasValue);

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    Serial.println("DATA CAME FROM NODE 1");
    Serial.println("================================");
  }
};


// Create scanner callback
ScanCallbacks scanCallbacks;


// =====================================================
// SETUP
// =====================================================
void setup() {

  Serial.begin(115200);

  delay(1000);

  NimBLEDevice::init(NODE_NAME);

  NimBLEScan *scan =
    NimBLEDevice::getScan();

  scan->setScanCallbacks(&scanCallbacks);

  // Active scanning
  scan->setActiveScan(true);

  // Fast scan
  scan->setInterval(20);
  scan->setWindow(20);

  // Continuous scanning
  scan->start(0, false);


  Serial.println();
  Serial.println("================================");
  Serial.println("       KAVACHAM NODE 2");
  Serial.println("       BLE RECEIVER");
  Serial.println("================================");

  Serial.println("Waiting for NODE 1...");
}


// =====================================================
// LOOP
// =====================================================
void loop() {

  // BLE scanner runs continuously

}

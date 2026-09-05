#include <Arduino.h>
#include <NimBLEDevice.h>

// =====================================================
// KAVACHAM - NODE 2
// BLE RECEIVER + RELAY
// =====================================================

#define NODE_ID    2
#define NODE_TYPE  1

// =====================================================
// BLE
// =====================================================

NimBLEAdvertising* advertising = nullptr;
NimBLEScan* scan = nullptr;

// =====================================================
// RELAY STATE
// =====================================================

bool relayActive = false;
unsigned long relayStopTime = 0;

uint8_t relayPacketData[7];

// =====================================================
// DUPLICATE CONTROL
// =====================================================

uint8_t lastSourceNode = 0;
uint8_t lastSequence = 255;
bool hasReceivedPacket = false;

// =====================================================
// START SCANNING
// =====================================================

void startScanning() {

  if (!scan) {
    return;
  }

  if (scan->isScanning()) {
    return;
  }

  scan->start(
    0,
    false
  );
}

// =====================================================
// STOP SCANNING
// =====================================================

void stopScanning() {

  if (!scan) {
    return;
  }

  if (scan->isScanning()) {
    scan->stop();
  }
}

// =====================================================
// START RELAY
// =====================================================

void startRelay(
  const uint8_t* packet
) {

  memcpy(
    relayPacketData,
    packet,
    7
  );

  std::string data(
    (char*)relayPacketData,
    7
  );

  // Stop scanning temporarily
  stopScanning();

  advertising->stop();
  advertising->clearData();

  NimBLEAdvertisementData advertisement;

  advertisement.setFlags(0x06);

  advertisement.setName(
    "KAVACHAM"
  );

  advertisement.setManufacturerData(
    data
  );

  advertising->setAdvertisementData(
    advertisement
  );

  advertising->start();

  relayActive = true;

  // Relay for 300 ms.
  // This is enough to be detected,
  // without blocking the BLE scan.

  relayStopTime =
      millis() + 300;
}

// =====================================================
// STOP RELAY
// =====================================================

void stopRelay() {

  if (!relayActive) {
    return;
  }

  advertising->stop();

  relayActive = false;

  Serial.println(
    "Relay finished."
  );

  // Immediately return to scanning
  startScanning();

  Serial.println(
    "Node 2 scanning again..."
  );
}

// =====================================================
// RELAY PACKET
// =====================================================

void relayPacket(
  const uint8_t* packet,
  size_t length
) {

  if (length != 7) {
    return;
  }

  // ---------------------------------------------
  // Verify protocol
  // ---------------------------------------------

  if (
    packet[0] != 0xCA
  ) {
    return;
  }

  uint8_t sourceNode =
      packet[1];

  uint8_t status =
      packet[2];

  uint8_t sequence =
      packet[3];

  // ---------------------------------------------
  // Ignore own packets
  // ---------------------------------------------

  if (
    sourceNode == NODE_ID
  ) {
    return;
  }

  // ---------------------------------------------
  // Ignore exact duplicate
  // ---------------------------------------------

  if (
    hasReceivedPacket &&
    sourceNode == lastSourceNode &&
    sequence == lastSequence
  ) {

    return;
  }

  lastSourceNode =
      sourceNode;

  lastSequence =
      sequence;

  hasReceivedPacket =
      true;

  // ---------------------------------------------
  // Decode status
  // ---------------------------------------------

  bool gasUnsafe =
      status & 0x01;

  bool tempUnsafe =
      status & 0x02;

  bool fallUnsafe =
      status & 0x04;

  bool manualSOS =
      status & 0x08;

  // ---------------------------------------------
  // Display
  // ---------------------------------------------

  Serial.println();

  Serial.println(
    "================================"
  );

  Serial.println(
    "       NODE 2 BLE RECEIVED"
  );

  Serial.println(
    "================================"
  );

  Serial.print(
    "Source Node : "
  );

  Serial.println(
    sourceNode
  );

  Serial.print(
    "Sequence    : "
  );

  Serial.println(
    sequence
  );

  Serial.print(
    "Gas         : "
  );

  Serial.println(
    packet[4]
  );

  Serial.print(
    "Temperature : "
  );

  Serial.print(
    packet[5]
  );

  Serial.println(
    " C"
  );

  Serial.print(
    "Gas Status  : "
  );

  Serial.println(
    gasUnsafe ?
    "UNSAFE" :
    "SAFE"
  );

  Serial.print(
    "Temp Status : "
  );

  Serial.println(
    tempUnsafe ?
    "UNSAFE" :
    "SAFE"
  );

  Serial.print(
    "Fall Status : "
  );

  Serial.println(
    fallUnsafe ?
    "DETECTED" :
    "SAFE"
  );

  // =================================================
  // AUTOMATIC EMERGENCY
  // =================================================

  if (
    gasUnsafe ||
    tempUnsafe ||
    fallUnsafe
  ) {

    Serial.println();

    Serial.println(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    );

    Serial.println(
      " NODE 1 EMERGENCY RECEIVED"
    );

    Serial.println(
      " RELAYING EMERGENCY PACKET"
    );

    Serial.println(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    );

    startRelay(
      packet
    );

    return;
  }

  // =================================================
  // MANUAL SOS
  // =================================================

  if (manualSOS) {

    Serial.println();

    Serial.println(
      "================================"
    );

    Serial.println(
      " NODE 1 MANUAL SOS RECEIVED"
    );

    Serial.println(
      " RELAYING MANUAL SOS"
    );

    Serial.println(
      "================================"
    );

    startRelay(
      packet
    );

    return;
  }
}

// =====================================================
// BLE SCAN CALLBACK
// =====================================================

class ScanCallbacks :
  public NimBLEScanCallbacks {

  void onResult(
    const NimBLEAdvertisedDevice* device
  ) override {

    // ---------------------------------------------
    // Only KAVACHAM
    // ---------------------------------------------

    if (
      !device->haveName()
    ) {
      return;
    }

    if (
      device->getName() !=
      "KAVACHAM"
    ) {
      return;
    }

    // ---------------------------------------------
    // Manufacturer data
    // ---------------------------------------------

    if (
      !device->haveManufacturerData()
    ) {
      return;
    }

    std::string data =
      device->getManufacturerData();

    if (
      data.length() != 7
    ) {
      return;
    }

    uint8_t packet[7];

    memcpy(
      packet,
      data.data(),
      7
    );

    // ---------------------------------------------
    // Protocol check
    // ---------------------------------------------

    if (
      packet[0] != 0xCA
    ) {
      return;
    }

    // ---------------------------------------------
    // Process packet
    // ---------------------------------------------

    relayPacket(
      packet,
      7
    );
  }
};

ScanCallbacks scanCallbacks;

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(
    115200
  );

  delay(1000);

  Serial.println();

  Serial.println(
    "================================"
  );

  Serial.println(
    "       KAVACHAM NODE 2"
  );

  Serial.println(
    "    BLE RECEIVER + RELAY"
  );

  Serial.println(
    "================================"
  );

  // ---------------------------------------------
  // BLE
  // ---------------------------------------------

  NimBLEDevice::init(
    "KAVACHAM"
  );

  advertising =
      NimBLEDevice::getAdvertising();

  // ---------------------------------------------
  // Scan
  // ---------------------------------------------

  scan =
      NimBLEDevice::getScan();

  scan->setScanCallbacks(
    &scanCallbacks
  );

  scan->setActiveScan(
    true
  );

  scan->setInterval(
    45
  );

  scan->setWindow(
    30
  );

  startScanning();

  Serial.println(
    "BLE scanning started"
  );

  Serial.println(
    "Waiting for Node 1..."
  );
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  // ---------------------------------------------
  // End relay without blocking
  // ---------------------------------------------

  if (
    relayActive &&
    millis() >= relayStopTime
  ) {

    stopRelay();
  }

  // ---------------------------------------------
  // Safety recovery:
  // make sure scanning is alive
  // ---------------------------------------------

  if (
    !relayActive &&
    !scan->isScanning()
  ) {

    startScanning();
  }

  delay(5);
}

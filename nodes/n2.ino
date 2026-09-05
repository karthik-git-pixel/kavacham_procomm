```cpp
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

// =====================================================
// DUPLICATE PACKET CONTROL
// =====================================================

uint8_t lastSourceNode = 0;
uint8_t lastSequence = 255;
bool hasReceivedPacket = false;

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
  // Verify KAVACHAM packet
  // ---------------------------------------------

  if (packet[0] != 0xCA) {
    return;
  }

  uint8_t sourceNode = packet[1];
  uint8_t status     = packet[2];
  uint8_t sequence   = packet[3];

  // ---------------------------------------------
  // Ignore our own packets
  // ---------------------------------------------

  if (sourceNode == NODE_ID) {
    return;
  }

  // ---------------------------------------------
  // Ignore duplicate packets
  // ---------------------------------------------

  if (
    hasReceivedPacket &&
    sourceNode == lastSourceNode &&
    sequence == lastSequence
  ) {
    return;
  }

  lastSourceNode = sourceNode;
  lastSequence = sequence;
  hasReceivedPacket = true;

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
  // Display received information
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
  Serial.println(sourceNode);

  Serial.print(
    "Sequence    : "
  );
  Serial.println(sequence);

  Serial.print(
    "Gas         : "
  );
  Serial.println(packet[4]);

  Serial.print(
    "Temperature : "
  );
  Serial.print(packet[5]);
  Serial.println(" C");

  Serial.print(
    "Gas Status  : "
  );
  Serial.println(
    gasUnsafe ? "UNSAFE" : "SAFE"
  );

  Serial.print(
    "Temp Status : "
  );
  Serial.println(
    tempUnsafe ? "UNSAFE" : "SAFE"
  );

  Serial.print(
    "Fall Status : "
  );
  Serial.println(
    fallUnsafe ? "DETECTED" : "SAFE"
  );

  // =================================================
  // EMERGENCY PACKET
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

    // Relay the SAME packet.
    // Source node remains Node 1.
    // Status remains unchanged.
    // Sequence remains unchanged.

    std::string data(
      (char*)packet,
      length
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

    Serial.println(
      "BLE -> EMERGENCY RELAYED"
    );
  }

  // =================================================
  // MANUAL SOS
  // =================================================

  else if (manualSOS) {

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

    // Relay the SAME manual SOS packet.

    std::string data(
      (char*)packet,
      length
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

    // Manual SOS should not remain
    // continuously advertised.

    delay(700);

    advertising->stop();

    Serial.println(
      "Manual SOS relay finished."
    );
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
    // Only accept KAVACHAM devices
    // ---------------------------------------------

    if (!device->haveName()) {
      return;
    }

    if (
      device->getName() != "KAVACHAM"
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

    // Must contain exactly our 7-byte packet.

    if (data.length() != 7) {
      return;
    }

    // ---------------------------------------------
    // Convert to packet
    // ---------------------------------------------

    uint8_t packet[7];

    memcpy(
      packet,
      data.data(),
      7
    );

    // ---------------------------------------------
    // Check protocol identifier
    // ---------------------------------------------

    if (packet[0] != 0xCA) {
      return;
    }

    // ---------------------------------------------
    // Relay packet
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

  Serial.begin(115200);

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
  // BLE initialization
  // ---------------------------------------------

  NimBLEDevice::init(
    "KAVACHAM"
  );

  advertising =
    NimBLEDevice::getAdvertising();

  // ---------------------------------------------
  // BLE scanning
  // ---------------------------------------------

  NimBLEScan* scan =
    NimBLEDevice::getScan();

  scan->setScanCallbacks(
    &scanCallbacks
  );

  scan->setActiveScan(true);

  scan->setInterval(45);

  scan->setWindow(30);

  // Continuous scanning

  scan->start(
    0,
    false
  );

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

  // Node 2 is primarily handled by
  // the BLE scan callback.

  delay(10);
}
```

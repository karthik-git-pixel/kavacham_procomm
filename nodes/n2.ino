#include <NimBLEDevice.h>

#define PACKET_SIZE 7
#define KAVACHAM_PROTOCOL 0xCA

NimBLEScan* pScan;
NimBLEAdvertising* pAdvertising;

uint8_t pendingPacket[PACKET_SIZE];
volatile bool packetPending = false;

uint8_t lastSource = 0;
uint8_t lastSequence = 255;

unsigned long lastRelayTime = 0;

#define RELAY_ADV_TIME 250
#define RELAY_GAP 100

// --------------------------------------------------
// BLE SCAN CALLBACK
// --------------------------------------------------

class ScanCallbacks : public NimBLEScanCallbacks
{
  void onResult(const NimBLEAdvertisedDevice* device) override
  {
    if (!device->haveName())
      return;

    if (device->getName() != "KAVACHAM")
      return;

    if (!device->haveManufacturerData())
      return;

    std::string data = device->getManufacturerData();

    if (data.length() != PACKET_SIZE)
      return;

    const uint8_t* rx =
      (const uint8_t*)data.data();

    if (rx[0] != KAVACHAM_PROTOCOL)
      return;

    uint8_t source = rx[1];
    uint8_t sequence = rx[3];

    // Ignore exact duplicate
    if (source == lastSource &&
        sequence == lastSequence)
    {
      return;
    }

    // Copy packet immediately.
    // DO NOT advertise here.
    memcpy(pendingPacket, rx, PACKET_SIZE);

    packetPending = true;

    Serial.println();
    Serial.println(">>> BLE PACKET RECEIVED <<<");

    Serial.print("Source: ");
    Serial.println(source);

    Serial.print("Sequence: ");
    Serial.println(sequence);
  }
};

ScanCallbacks scanCallbacks;


// --------------------------------------------------
// START SCANNING
// --------------------------------------------------

void startScanning()
{
  pScan->stop();
  delay(20);

  pScan->clearResults();

  pScan->setActiveScan(true);

  pScan->start(1000, false);

  Serial.println("BLE SCAN STARTED");
}


// --------------------------------------------------
// RELAY PACKET
// --------------------------------------------------

void relayPacket()
{
  if (!packetPending)
    return;

  if (millis() - lastRelayTime < RELAY_GAP)
    return;

  // Take local copy
  uint8_t packet[PACKET_SIZE];

  noInterrupts();

  memcpy(packet, pendingPacket, PACKET_SIZE);
  packetPending = false;

  interrupts();

  uint8_t source = packet[1];
  uint8_t sequence = packet[3];

  lastSource = source;
  lastSequence = sequence;

  Serial.println();
  Serial.println("================================");
  Serial.println("        RELAYING PACKET");
  Serial.println("================================");

  Serial.print("SOURCE: ");
  Serial.println(source);

  Serial.print("SEQUENCE: ");
  Serial.println(sequence);

  // Stop scanner before advertising
  pScan->stop();

  delay(30);

  // Prepare manufacturer data
  std::string data(
    (char*)packet,
    PACKET_SIZE
  );

  pAdvertising->stop();
  pAdvertising->clearData();

  NimBLEAdvertisementData advertisement;

  advertisement.setFlags(0x06);
  advertisement.setName("KAVACHAM");
  advertisement.setManufacturerData(data);

  pAdvertising->setAdvertisementData(advertisement);

  // Advertise relay packet
  pAdvertising->start();

  delay(RELAY_ADV_TIME);

  pAdvertising->stop();
  pAdvertising->clearData();

  lastRelayTime = millis();

  Serial.println("RELAY COMPLETE");

  // Immediately return to scanning
  startScanning();
}


// --------------------------------------------------
// SETUP
// --------------------------------------------------

void setup()
{
  Serial.begin(115200);

  Serial.println();
  Serial.println("================================");
  Serial.println("       KAVACHAM NODE 2");
  Serial.println("================================");

  NimBLEDevice::init("KAVACHAM");

  pScan = NimBLEDevice::getScan();

  pScan->setScanCallbacks(&scanCallbacks);

  pScan->setActiveScan(true);

  pScan->setInterval(45);
  pScan->setWindow(30);

  pAdvertising = NimBLEDevice::getAdvertising();

  startScanning();
}


// --------------------------------------------------
// LOOP
// --------------------------------------------------

void loop()
{
  relayPacket();

  // Restart scanning if scan has finished
  if (!packetPending &&
      !pScan->isScanning())
  {
    startScanning();
  }

  delay(5);
}

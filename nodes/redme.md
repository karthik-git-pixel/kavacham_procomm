# KAVACHAM – BLE Multi-Hop Relay

## Current Implementation Reference

### 1. Architecture

```text
NODE 1  ──BLE──>  NODE 2  ──BLE──>  NODE 3  ──BLE──>  GATEWAY
Farthest          Middle            Near              Wi-Fi/MQTT
```

* **Node 1:** Sensor node + BLE transmitter
* **Node 2:** BLE receiver + BLE relay
* **Node 3:** BLE receiver + BLE relay
* **Gateway:** Final BLE receiver → Wi-Fi → MQTT → React dashboard
* All worker nodes are intended to support BLE receiving and transmitting.
* Current implementation uses **NimBLE-Arduino**.
* This is a **custom BLE advertisement relay**, not formal Bluetooth Mesh.

---

## 2. Current BLE Packet

The current packet is **5 bytes**:

```text
Byte 0   = Node ID
Byte 1   = Gas HIGH byte
Byte 2   = Gas LOW byte
Byte 3   = Temperature
Byte 4   = Humidity
```

Example:

```text
[01][09][C4][2A][55]
```

Decoded:

```text
Node       = 1
Gas        = 2500
Temperature = 42 °C
Humidity   = 85 %
```

The packet is transmitted using **BLE Manufacturer Data**.

BLE advertisement name:

```text
KAVACHAM
```

---

## 3. Node 1 – Sensor + BLE Transmitter

### Hardware

| Component   |   GPIO |
| ----------- | -----: |
| MQ-6 AO     | GPIO34 |
| DHT11 DATA  |  GPIO4 |
| Push Button | GPIO23 |
| Buzzer      |  GPIO5 |

Button configuration:

```cpp
INPUT_PULLUP
```

Button wiring:

```text
GPIO23 ─── Button ─── GND
```

### Node 1 behavior

1. ESP32 reads MQ-6 and DHT11.
2. Button is detected using an edge transition.
3. First press:

   * SOS activates.
   * Buzzer turns ON.
   * BLE transmission starts.
4. Sensor packet is transmitted every **1 second**.
5. Second press:

   * SOS stops.
   * Buzzer turns OFF.
   * BLE advertising stops.

### Current packet generation

```cpp
uint8_t packet[5];

packet[0] = 1;
packet[1] = (gasValue >> 8) & 0xFF;
packet[2] = gasValue & 0xFF;
packet[3] = tempValue;
packet[4] = humValue;
```

Manufacturer data:

```cpp
std::string manufacturerData((char*)packet, sizeof(packet));
```

---

## 4. Node 2 – BLE Receiver + Relay

Node 2 scans for:

```text
KAVACHAM
```

It checks for Manufacturer Data of exactly:

```text
5 bytes
```

Then decodes:

```cpp
uint8_t nodeID = packet[0];

uint16_t gasValue =
    ((uint16_t)packet[1] << 8) | packet[2];

uint8_t temperature = packet[3];

uint8_t humidity = packet[4];
```

Node 2 then retransmits the **same received packet**.

```text
Node 1
   │
   │ BLE
   ▼
Node 2
   │
   │ BLE relay
   ▼
Node 3
```

Node 2 does **not modify the sensor data**.

---

## 5. Node 3 – BLE Receiver + Relay

Node 3 performs the same operation as Node 2.

```text
Node 1 packet
      ↓
Node 2 receives
      ↓
Node 2 relays
      ↓
Node 3 receives
      ↓
Node 3 relays
      ↓
Gateway
```

Node 3 preserves the original source Node ID.

Example:

```text
ORIGINAL SOURCE: NODE 1
Gas: 3200
Temperature: 42 C
Humidity: 87 %
```

Node 3 then advertises the same 5-byte packet toward the gateway.

---

## 6. BLE Configuration

Library:

```text
NimBLE-Arduino
```

Scanning uses the NimBLE 2.x callback API:

```cpp
class ScanCallbacks : public NimBLEScanCallbacks {
    void onResult(const NimBLEAdvertisedDevice *device) override {
        // receive packet
    }
};
```

Scanner setup:

```cpp
NimBLEScan *scan = NimBLEDevice::getScan();

scan->setScanCallbacks(&scanCallbacks);
scan->setActiveScan(true);
scan->setInterval(20);
scan->setWindow(20);
scan->start(0, false);
```

Advertising packet:

```cpp
NimBLEAdvertisementData data;

data.setFlags(0x06);
data.setName("KAVACHAM");
data.setManufacturerData(receivedData);
```

---

## 7. Why 5-Byte Packet Was Used

Earlier packets containing large text strings/service data were unreliable because BLE legacy advertising has a very small payload limit.

Therefore the implementation was changed to:

```text
Binary Manufacturer Data
```

instead of long text.

Current packet:

```text
5 bytes
```

This allows the sensor data to fit into the advertisement reliably.

---

## 8. Current Status

### Working

```text
Node 1
  ↓
BLE advertisement
  ↓
Node 2
  ↓
BLE relay
  ↓
Node 3
  ↓
BLE relay
  ↓
Gateway
```

Implemented:

* MQ-6 sensor reading
* DHT11 temperature reading
* DHT11 humidity reading
* Push-button SOS activation
* Push-button SOS deactivation
* Buzzer activation/deactivation
* BLE advertising
* BLE scanning
* Dynamic sensor data transmission
* Node 2 BLE relay
* Node 3 BLE relay
* Original source Node ID preservation
* Binary 5-byte packet

---

# IMPORTANT – NEXT REQUIRED IMPROVEMENT

The current relay implementation **does NOT have duplicate/loop protection**.

Current packet:

```text
[Node ID][Gas H][Gas L][Temp][Humidity]
```

does not contain:

* Event ID
* Sequence number
* Hop count / TTL

Therefore, when multiple nodes scan and advertise simultaneously, packets can potentially be received repeatedly and relayed indefinitely.

### Next packet format should be something like:

```text
[PROTOCOL]
[SOURCE NODE]
[EVENT/SEQUENCE ID]
[GAS HIGH]
[GAS LOW]
[TEMPERATURE]
[HUMIDITY]
[HOP/TTL]
```

Example:

```text
[CA][01][27][09][C4][2A][55][03]
```

This will allow:

* Duplicate detection
* Loop prevention
* Event identification
* Maximum hop control
* Reliable multi-hop propagation

---

## 9. Planned Final Flow

```text
WORKER NODE 1
     │
     │ Local sensor threshold exceeded
     │
     ├── Buzzer ON
     ├── SOS packet created
     │
     ▼
   BLE TX
     │
     ▼
WORKER NODE 2
     │
     ├── BLE RX
     ├── Check packet
     ├── Check duplicate/event ID
     ├── Local relay
     │
     ▼
   BLE TX
     │
     ▼
WORKER NODE 3
     │
     ├── BLE RX
     ├── Check packet
     ├── Check duplicate/event ID
     ├── Local relay
     │
     ▼
 GATEWAY ESP32
     │
     ├── BLE RX
     ├── Decode event
     │
     ▼
    Wi-Fi
     │
     ▼
    MQTT
     │
     ▼
 React Dashboard
```

## 10. Important Design Rule

**Safety decisions remain local to each worker node.**

The gateway/dashboard should receive and display events, but should not be required to make the initial emergency decision.

Demo architecture:

```text
Sensor → Local ESP32 Decision → BLE Relay Network → Gateway → MQTT → Dashboard
```

# KAVACHAM – Current System Status

## 1. Current Architecture

The system currently uses **2 worker nodes + 1 Gateway**.

```text
NODE 1
  │
  │ BLE
  ▼
NODE 2
  │
  │ BLE relay
  ▼
GATEWAY ESP32
  │
  │ Wi-Fi
  ▼
LAPTOP / MOSQUITTO BROKER
  │
  │ MQTT
  ▼
DASHBOARD
```

**Node 3 has been removed/scrapped.**

---

# 2. Node 1 – Worker Sensor Node

Node 1 is responsible for sensing worker/environment conditions and generating emergency events.

### Sensors / Hardware

* ESP32
* MQ-6 gas sensor
* DHT11 temperature sensor
* MPU6050 IMU
* SOS push button
* Buzzer

### Important pins

```text
MQ-6 Analog : GPIO 34
MQ-6 Digital: GPIO 18
Button      : GPIO 23
Buzzer      : GPIO 5
```

### Safety thresholds

```text
Gas threshold         : > 800
Temperature threshold : > 70°C
```

### Fall detection

Fall detection uses MPU6050 data.

```text
IMU sampling interval : 10 ms

Free fall threshold : 0.65 g
Impact threshold     : 2.0 g
Gyroscope threshold  : 180°/s
Fall detection window: 1000 ms
Fall cooldown        : 3000 ms
```

---

# 3. Node 1 Safety Logic

## SAFE state

System is SAFE when:

```text
Gas <= 800
Temperature <= 70°C
No fall detected
```

In SAFE state:

* Buzzer OFF
* No automatic SOS BLE transmission

---

## Automatic SOS

Automatic SOS is triggered when a critical condition occurs:

```text
Gas > 800
OR
Temperature > 70°C
OR
Fall detected
```

When automatic SOS is triggered:

* Buzzer ON
* Emergency BLE packet transmitted continuously
* SOS remains latched
* System does NOT repeatedly create new SOS events from the same unsafe condition

Automatic SOS is acknowledged by **one complete button press + release**.

After acknowledgement:

* Buzzer OFF
* Emergency BLE transmission stops
* System enters the cooldown/reset handling

---

# 4. Manual SOS

If the system is SAFE:

```text
Button press + release
```

creates a **manual SOS**.

Manual SOS:

* Sends a short BLE SOS burst
* Does not activate automatic SOS mode
* Buzzer remains OFF

A button being held does **not** repeatedly trigger SOS.

---

# 5. MQ-6 Sensor Removal Demo

For demonstration purposes, removing the MQ-6 is treated as a gas emergency using the following heuristic:

```cpp
#define GAS_DISCONNECTED_LOW  50
#define GAS_DISCONNECTED_HIGH 4090
```

If the analog reading is approximately:

```text
<= 50
OR
>= 4090
```

the system treats the gas sensor as disconnected/unsafe.

This is a **demo heuristic**, not a reliable physical sensor-presence detector.

---

# 6. SOS Cooldown

A cooldown has been established:

```cpp
#define SOS_COOLDOWN_MS 3000
```

The purpose is to prevent an immediate repeated SOS event after acknowledgement.

The intended behavior is:

```text
SOS
 ↓
Button press + release
 ↓
SOS cleared
 ↓
3 second cooldown
 ↓
System becomes ready again
```

---

# 7. BLE Packet Format

All current nodes use the same **7-byte KAVACHAM packet**.

```text
Byte 0 → Protocol
Byte 1 → Source Node ID
Byte 2 → Status
Byte 3 → Sequence
Byte 4 → Gas
Byte 5 → Temperature
Byte 6 → Node Type
```

### Protocol

```text
0xCA
```

### Status bits

```text
Bit 0 → Gas unsafe
Bit 1 → Temperature unsafe
Bit 2 → Fall unsafe
Bit 3 → Manual SOS
```

Therefore:

```text
0x01 → Gas unsafe
0x02 → Temperature unsafe
0x04 → Fall
0x08 → Manual SOS
```

Multiple bits can be active simultaneously.

---

# 8. BLE Device Identification

All KAVACHAM BLE packets use:

```text
BLE name: KAVACHAM
```

The packet is carried using BLE manufacturer data.

The manufacturer data is explicitly created using the complete 7-byte packet:

```cpp
std::string data((char*)packet, sizeof(packet));
```

---

# 9. Node 2 – BLE Relay

Node 2 acts as a **pure BLE relay**.

```text
Node 1
   ↓
 BLE
   ↓
Node 2
   ↓
 BLE
   ↓
Gateway
```

Node 2:

* Receives KAVACHAM packets
* Preserves the original packet
* Does NOT create its own emergency event from received data
* Relays the original source/details
* Uses packet source + sequence to avoid exact duplicates

The BLE callback does not perform the complete relay operation directly.

Instead:

```text
BLE callback
    ↓
Copy packet
    ↓
Set pending flag
    ↓
Main loop processes packet
    ↓
Stop scanning
    ↓
Advertise received packet
    ↓
Stop advertising
    ↓
Restart scanning
```

This was established to prevent the scanner from becoming stuck after receiving the first packet.

---

# 10. Gateway ESP32

The Gateway performs three jobs:

```text
BLE Receiver
Wi-Fi Connection
MQTT Publisher
```

Gateway receives the 7-byte KAVACHAM packet and decodes:

```text
Protocol
Source Node
Sequence
Gas
Temperature
Gas unsafe
Temperature unsafe
Fall
Manual SOS
Node type
RSSI
BLE address
```

---

# 11. Gateway BLE Processing

Gateway uses the same callback → pending packet → main loop architecture.

The callback:

* Checks BLE name = `KAVACHAM`
* Checks manufacturer data length = 7
* Checks protocol = `0xCA`
* Copies the packet into a pending buffer

The main loop then processes it.

This keeps BLE processing independent from MQTT processing.

---

# 12. MQTT Configuration

Current Wi-Fi:

```cpp
const char* WIFI_SSID = "Karthik";
const char* WIFI_PASSWORD = "12345678";
```

Current MQTT broker:

```cpp
const char* MQTT_BROKER = "192.168.146.22";
const int MQTT_PORT = 1883;
```

Current topic:

```cpp
mine/test
```

---

# 13. MQTT Payload

Gateway converts the received packet into JSON.

Example structure:

```json
{
  "node": 1,
  "worker_id": "WSN-1",
  "message": "CRITICAL_FALL",
  "sequence": 25,
  "gas": 120,
  "temperature": 31,
  "gas_unsafe": false,
  "temperature_unsafe": false,
  "fall": true,
  "manual_sos": false,
  "node_type": 1,
  "rssi": -65,
  "ble_address": "...",
  "gateway": "KAVACHAM_GATEWAY"
}
```

---

# 14. MQTT Issue That Was Solved

Initially:

```text
MQTT PUBLISH FAILED
MQTT State = 0
```

Important meaning:

```text
MQTT State = 0
```

means the MQTT connection itself was established.

The actual problem was the MQTT packet buffer being too small for the JSON payload.

The Gateway was therefore updated with:

```cpp
mqttClient.setBufferSize(512);
```

This solved the publishing problem.

---

# 15. Verified End-to-End Communication

The following chain has now been successfully established:

```text
Node 1
  ↓
BLE emergency packet
  ↓
Node 2
  ↓
BLE relay
  ↓
Gateway ESP32
  ↓
Wi-Fi
  ↓
Mosquitto MQTT broker
  ↓
mine/test
  ↓
Laptop MQTT subscriber
```

The Gateway has successfully:

```text
Received BLE packet
        ↓
Decoded packet
        ↓
Generated JSON
        ↓
Connected to MQTT
        ↓
Published JSON successfully
```

Laptop subscriber was previously verified using:

```bash
mosquitto_sub -h 192.168.146.22 -t mine/test -v
```

---

# 16. Current Gateway Status

The current Gateway code has:

```text
Wi-Fi reconnect handling
MQTT reconnect handling
MQTT 512-byte buffer
BLE scanning
BLE packet validation
BLE duplicate filtering
BLE packet buffering
BLE → JSON conversion
MQTT publishing
```

MQTT reconnect attempts are rate-limited to:

```text
3000 ms
```

BLE scanning uses finite scan windows and restarts from the main loop.

---

# 17. Current System Status

### VERIFIED

* [x] Node 1 sensor logic
* [x] Automatic SOS logic
* [x] Manual SOS logic
* [x] Button press/release behavior
* [x] Fall detection
* [x] 7-byte BLE packet format
* [x] Node 1 → Node 2 BLE communication
* [x] Node 2 relay architecture
* [x] Gateway BLE reception
* [x] Gateway packet decoding
* [x] Gateway Wi-Fi connection
* [x] Gateway MQTT connection
* [x] MQTT publishing
* [x] Laptop Mosquitto reception
* [x] MQTT buffer-size issue fixed

### NOT YET FINALIZED

* [ ] React dashboard
* [ ] Live worker cards/status
* [ ] Dashboard emergency alerts
* [ ] Full long-duration stress test of continuous packets
* [ ] Final physical demo integration
* [ ] Final presentation/demo flow

---

# 18. Current Important Constants

```text
BLE protocol       : 0xCA
BLE name           : KAVACHAM
Packet size        : 7 bytes

Gas threshold      : 800
Temperature        : 70°C

Fall free-fall     : 0.65 g
Fall impact        : 2.0 g
Fall gyro          : 180°/s

IMU interval       : 10 ms
Fall window        : 1000 ms
Fall cooldown      : 3000 ms

SOS cooldown       : 3000 ms

MQTT broker        : 192.168.146.22
MQTT port          : 1883
MQTT topic         : mine/test
MQTT buffer        : 512 bytes

Wi-Fi SSID         : Karthik
```

---

# 19. Current Development Position

The **sensor → BLE → relay → Gateway → Wi-Fi → MQTT pipeline is established and working**.

The next major development stage is the **live dashboard**, which should subscribe to:

```text
mine/test
```

and display the worker's:

```text
Worker ID
Gas
Temperature
Fall status
Manual SOS
Emergency status
Node status
RSSI
```

The dashboard should consume the existing MQTT JSON **without changing the established Node 1, Node 2, Gateway packet format, or communication architecture**.

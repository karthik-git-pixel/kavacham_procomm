import mqtt from 'mqtt';
import { ingestTelemetry, ingestProximity } from './nodeStore';

const MQTT_URL =
  import.meta.env.VITE_MQTT_URL || 'ws://localhost:9001';

let client = null;

export function connectMQTT({
  onStatusChange,
  onMessage,
} = {}) {

  console.log('Connecting to MQTT:', MQTT_URL);

  onStatusChange?.('connecting');

  client = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 2000,
    connectTimeout: 5000,
    clean: true,
  });

  client.on('connect', () => {
    console.log('✅ MQTT connected:', MQTT_URL);

    onStatusChange?.('live');

    // Sensor telemetry
    client.subscribe(
      'kavacham/sensor/+',
      { qos: 0 },
      (err) => {
        if (err) {
          console.error('Sensor subscription failed:', err);
        } else {
          console.log('✅ Subscribed: kavacham/sensor/+');
        }
      }
    );

    // Proximity data
    client.subscribe(
      'kavacham/proximity/+',
      { qos: 0 },
      (err) => {
        if (err) {
          console.error('Proximity subscription failed:', err);
        } else {
          console.log('✅ Subscribed: kavacham/proximity/+');
        }
      }
    );
  });

  client.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());

      console.log('📡 MQTT MESSAGE');
      console.log('Topic:', topic);
      // console.log('Data:', data);

      if (topic.startsWith('kavacham/sensor/')) {
        ingestTelemetry(data);
      } else if (topic.startsWith('kavacham/proximity/')) {
        ingestProximity(data);
      }

      onMessage?.(topic, data);

    } catch (error) {
      console.warn(
        'Invalid MQTT payload:',
        payload.toString()
      );
    }
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
    onStatusChange?.('reconnecting');
  });

  client.on('offline', () => {
    console.log('⚠️ MQTT offline');
    onStatusChange?.('reconnecting');
  });

  client.on('error', (error) => {
    console.error('❌ MQTT error:', error);
  });

  return client;
}

export function disconnectMQTT() {
  if (client) {
    client.end();
    client = null;
    console.log('MQTT disconnected');
  }
}
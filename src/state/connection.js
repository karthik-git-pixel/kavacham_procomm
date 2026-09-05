import { useSyncExternalStore } from 'react';
import mqtt from 'mqtt';
import { ingestTelemetry, ingestProximity, addEvent } from './nodeStore';
import { startMockPublisher, stopMockPublisher } from './mockPublisher';

const BROKER_URL = import.meta.env.VITE_MQTT_URL || 'ws://localhost:9001';

/** How long to wait for a broker before falling back to simulated telemetry. */
const FALLBACK_AFTER = 4000;

/** A connected broker with no publishers is still a dead dashboard. */
const SILENT_AFTER = 8000;

let client = null;
let fallbackTimer = null;
let watchdog = null;
let lastTelemetry = 0;
const listeners = new Set();

let state = {
  /** connecting | live | reconnecting | demo */
  mode: 'connecting',
  broker: BROKER_URL,
  since: Date.now(),
  /** True once the operator pins demo mode by hand. */
  pinned: false,
  /** Connected, but nothing has published within SILENT_AFTER. */
  silent: false,
  error: null,
};

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const getSnapshot = () => state;

export function useConnection() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const getConnection = () => state;

function enterDemo(reason) {
  if (state.mode === 'demo') return;
  stopClient();
  startMockPublisher();
  set({ mode: 'demo', since: Date.now(), error: reason || null });
  addEvent(null, 'Demo mode active — showing simulated telemetry', { level: 0, kind: 'Simulated' });
}

function stopClient() {
  if (client) {
    client.removeAllListeners?.();
    client.end(true);
    client = null;
  }
  clearTimeout(fallbackTimer);
  clearInterval(watchdog);
  fallbackTimer = null;
  watchdog = null;
}

export function connect({ autoFallback = true } = {}) {
  stopClient();
  stopMockPublisher();
  lastTelemetry = Date.now();
  set({ mode: 'connecting', since: Date.now(), error: null, pinned: false, silent: false });

  if (autoFallback) {
    fallbackTimer = setTimeout(
      () => enterDemo(`No broker at ${BROKER_URL}`),
      FALLBACK_AFTER
    );
  }

  try {
    client = mqtt.connect(BROKER_URL, {
      reconnectPeriod: 3000,
      connectTimeout: 4000,
      clean: true,
    });
  } catch (err) {
    enterDemo(err?.message || 'Broker unreachable');
    return;
  }

  client.on('connect', () => {
    clearTimeout(fallbackTimer);
    stopMockPublisher();
    set({ mode: 'live', since: Date.now(), error: null, silent: false });
    addEvent(null, 'Broker connected', { level: 0, kind: 'Success', value: BROKER_URL });
    client.subscribe(['kavacham/sensor/+', 'kavacham/proximity/+'], { qos: 0 });

    // Reaching the broker is not the same as receiving data: a running broker
    // with no publishers looks identical to a working system until you notice
    // every reading is a dash.
    clearInterval(watchdog);
    watchdog = setInterval(() => {
      if (state.mode !== 'live') return;
      const quiet = Date.now() - lastTelemetry > SILENT_AFTER;
      if (quiet !== state.silent) set({ silent: quiet });
    }, 2000);
  });

  client.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());
      if (topic.startsWith('kavacham/sensor/')) ingestTelemetry(data);
      else if (topic.startsWith('kavacham/proximity/')) ingestProximity(data);
      else return;
      lastTelemetry = Date.now();
      if (state.silent) set({ silent: false });
    } catch {
      // A malformed frame should never take the dashboard down.
    }
  });

  client.on('reconnect', () => {
    if (state.mode === 'live') set({ mode: 'reconnecting', since: Date.now() });
  });

  client.on('error', (err) => {
    set({ error: err?.message || 'Connection error' });
  });
}

/** Operator override: force simulated data, or go back to hunting for a broker. */
export function setDemoMode(on) {
  if (on) {
    clearTimeout(fallbackTimer);
    stopClient();
    startMockPublisher();
    set({ mode: 'demo', since: Date.now(), pinned: true, error: null, silent: false });
  } else {
    connect({ autoFallback: true });
  }
}

export function disconnect() {
  stopClient();
  stopMockPublisher();
}

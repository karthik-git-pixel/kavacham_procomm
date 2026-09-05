import { useSyncExternalStore } from 'react';
import { NODE_REGISTRY } from './constants';

const listeners = new Set();
const nodes = new Map();
const events = [];

export function addEvent(node, desc) {
  events.push({ time: Date.now(), node, desc });
  if (events.length > 50) events.shift();
}

// Initialize nodes with null for missing sensors
Object.entries(NODE_REGISTRY).forEach(([id, data]) => {
  nodes.set(id, {
    id,
    ...data,
    temp: null,
    humidity: null,
    gas_ppm: null,
    fall: null,
    sos: null,
    alert: null,
    accel_mag: null,
    rssi: null,
    distance: null,
    hops: null,
    link: 'offline',
    history: [],
  });
});

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cachedNodes = null;

function notify() {
  const newNodes = {};
  nodes.forEach((node, id) => {
    newNodes[id] = node;
  });
  cachedNodes = newNodes;
  listeners.forEach((l) => l());
}

export function useEventStore() {
  return useSyncExternalStore(subscribe, () => events);
}

// Initial cache build
notify();

export function getNodes() {
  return cachedNodes;
}

export function useNodeStore() {
  return useSyncExternalStore(subscribe, getNodes);
}

export function ingestTelemetry(data) {
  if (!data || !data.node) return;
  updateNode(data.node, data);
}

export function ingestProximity(data) {
  if (!data || !data.node) return;
  updateNode(data.node, data);
}

export function updateNode(id, payload) {
  const node = nodes.get(id);
  if (!node) return;
  
  const now = Date.now();
  const nextNode = { ...node, ...payload, lastSeen: now, link: 'live' };
  
  // SOS Latch
  if (payload.sos) {
    if (!node.sosLatchUntil || now > node.sosLatchUntil) {
      nextNode.sosLatchUntil = now + 5000;
      addEvent(id, 'SOS activated');
    } else {
      nextNode.sosLatchUntil = node.sosLatchUntil; // keep existing latch
    }
  }

  if (payload.fall) {
    addEvent(id, 'Fall detected');
  }

  if (payload.alert > 0 && node.alert !== payload.alert) {
    addEvent(id, `Alert level changed to ${payload.alert}`);
  }

  // Peak Gas
  if (payload.gas_ppm !== undefined && payload.gas_ppm !== null) {
    const val = payload.gas_ppm;
    if (!node.peakGas || val >= node.peakGas.value || now - node.peakGas.at > 10000) {
      nextNode.peakGas = { value: val, at: now };
    }
  }

  // History buffer (last 120 samples)
  const historyItem = { t: now, gas: payload.gas_ppm, temp: payload.temp, accel: payload.accel_mag };
  nextNode.history = [...(node.history || []).slice(-119), historyItem];

  nodes.set(id, nextNode);
  notify();
}

// 500ms Ticker
setInterval(() => {
  let changed = false;
  const now = Date.now();

  for (const [id, node] of nodes.entries()) {
    let nodeChanged = false;
    const nextNode = { ...node };
    
    // Link State
    if (node.lastSeen) {
      const age = now - node.lastSeen;
      let nextLink = node.link;
      if (age > 5000) nextLink = 'offline';
      else if (age > 2000) nextLink = 'stale';
      
      if (nextLink !== node.link) {
        nextNode.link = nextLink;
        nodeChanged = true;
      }
    }

    // SOS Latch Release
    if (node.sosLatchUntil && now > node.sosLatchUntil) {
      nextNode.sosLatchUntil = null;
      nextNode.sos = 0;
      nodeChanged = true;
    }

    // Peak Gas Decay
    if (node.peakGas && now - node.peakGas.at > 10000) {
      nextNode.peakGas = null;
      nodeChanged = true;
    }
    
    if (nodeChanged) {
      nodes.set(id, nextNode);
      changed = true;
    }
  }
  
  if (changed) notify();
}, 500);

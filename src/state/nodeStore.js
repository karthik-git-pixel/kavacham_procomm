import { useSyncExternalStore } from 'react';
import { NODE_REGISTRY, LINK, GAS, TEMP, accelToG, IMPACT } from './constants';
import { levelFor } from './severity';

const MAX_EVENTS = 200;
const MAX_HISTORY = 120;

const listeners = new Set();
const nodes = new Map();

let events = [];
let eventSeq = 0;

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Records an operator-facing event. `level` drives the row colour and the
 * Status column; `value` is the reading that justifies the entry, so the
 * timeline can answer "what was it at the time?" without a second lookup.
 */
export function addEvent(node, desc, { level = 0, value = null, kind } = {}) {
  const entry = {
    id: ++eventSeq,
    time: Date.now(),
    node,
    desc,
    value,
    level,
    kind: kind || ['Normal', 'Caution', 'Warning', 'Emergency'][level] || 'Normal',
  };
  // Replaced, never mutated: useSyncExternalStore compares snapshots by
  // identity, so pushing into the same array would silently skip re-renders.
  events = [entry, ...events].slice(0, MAX_EVENTS);
  return entry;
}

export function clearEvents() {
  events = [];
  notify();
}

/* -------------------------------------------------------------------------- */
/* Node registry                                                               */
/* -------------------------------------------------------------------------- */

function blankNode(id, data) {
  return {
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
    lastSeen: null,
    history: [],
  };
}

Object.entries(NODE_REGISTRY).forEach(([id, data]) => nodes.set(id, blankNode(id, data)));

/* -------------------------------------------------------------------------- */
/* Subscription plumbing                                                       */
/* -------------------------------------------------------------------------- */

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cachedNodes = null;

function notify() {
  const next = {};
  nodes.forEach((node, id) => {
    next[id] = node;
  });
  cachedNodes = next;
  listeners.forEach((l) => l());
}

export const getNodes = () => cachedNodes;
export const getEvents = () => events;

notify();

export function useNodeStore() {
  return useSyncExternalStore(subscribe, getNodes, getNodes);
}

export function useEventStore() {
  return useSyncExternalStore(subscribe, getEvents, getEvents);
}

/* -------------------------------------------------------------------------- */
/* Ingest                                                                      */
/* -------------------------------------------------------------------------- */

export function ingestTelemetry(data) {
  if (!data || !data.node) return;
  updateNode(data.node, data);
}

export function ingestProximity(data) {
  if (!data || !data.node) return;
  updateNode(data.node, data);
}

const isNum = (v) => v !== null && v !== undefined && !Number.isNaN(v);

/** Emits an event only when a reading crosses into a new severity band. */
function logThresholdCrossing(id, name, prev, next, thresholds, unit, format = (v) => Math.round(v)) {
  if (!isNum(next)) return;
  const prevLevel = levelFor(prev, thresholds);
  const nextLevel = levelFor(next, thresholds);
  if (nextLevel === prevLevel) return;

  if (nextLevel > prevLevel) {
    addEvent(id, `${name} entered ${['normal', 'caution', 'warning', 'emergency'][nextLevel]} range`, {
      level: nextLevel,
      value: `${format(next)} ${unit}`,
    });
  } else if (nextLevel === 0) {
    addEvent(id, `${name} returned to normal`, {
      level: 0,
      value: `${format(next)} ${unit}`,
      kind: 'Recovered',
    });
  }
}

export function updateNode(id, payload) {
  const node = nodes.get(id);
  if (!node) return;

  const now = Date.now();
  const next = { ...node, ...payload, lastSeen: now, link: 'live' };

  if (node.link === 'offline' && node.lastSeen) {
    addEvent(id, 'Link restored', { level: 0, kind: 'Recovered' });
  }

  // SOS latches for 5s so a momentary press cannot be missed between renders.
  if (payload.sos) {
    if (!node.sosLatchUntil || now > node.sosLatchUntil) {
      next.sosLatchUntil = now + 5000;
      addEvent(id, 'SOS activated', { level: 3, kind: 'Emergency' });
    } else {
      next.sosLatchUntil = node.sosLatchUntil;
    }
  }

  if (payload.fall && !node.fall) {
    const g = accelToG(payload.accel_mag);
    addEvent(id, 'Fall detected', {
      level: 3,
      kind: 'Emergency',
      value: isNum(g) ? `${g.toFixed(2)} g` : null,
    });
  }

  logThresholdCrossing(id, 'Gas', node.gas_ppm, next.gas_ppm, GAS, 'ppm');
  logThresholdCrossing(id, 'Temperature', node.temp, next.temp, TEMP, '°C', (v) => v.toFixed(1));

  if (isNum(node.temp) && Number.isNaN(payload.temp)) {
    addEvent(id, 'Climate sensor fault', { level: 2, kind: 'Warning', value: 'no reading' });
  }

  const prevG = accelToG(node.accel_mag);
  const nextG = accelToG(next.accel_mag);
  if (isNum(nextG) && levelFor(nextG, IMPACT) > levelFor(prevG, IMPACT) && levelFor(nextG, IMPACT) >= 2) {
    addEvent(id, 'Impact spike', { level: levelFor(nextG, IMPACT), value: `${nextG.toFixed(2)} g` });
  }

  // Peak-hold marker on the gas gauge, so a transient spike stays visible.
  if (isNum(payload.gas_ppm)) {
    const val = payload.gas_ppm;
    if (!node.peakGas || val >= node.peakGas.value || now - node.peakGas.at > 10000) {
      next.peakGas = { value: val, at: now };
    }
  }

  next.history = [
    ...(node.history || []).slice(-(MAX_HISTORY - 1)),
    { t: now, gas: next.gas_ppm, temp: next.temp, humidity: next.humidity, accel: next.accel_mag },
  ];

  nodes.set(id, next);
  notify();
}

/* -------------------------------------------------------------------------- */
/* Liveness ticker                                                             */
/* -------------------------------------------------------------------------- */

setInterval(() => {
  const now = Date.now();
  let changed = false;

  for (const [id, node] of nodes.entries()) {
    const next = { ...node };
    let nodeChanged = false;

    if (node.lastSeen) {
      const age = now - node.lastSeen;
      let link = 'live';
      if (age > LINK.OFFLINE_AFTER) link = 'offline';
      else if (age > LINK.STALE_AFTER) link = 'stale';

      if (link !== node.link) {
        next.link = link;
        nodeChanged = true;
        if (link === 'offline') {
          addEvent(id, 'Node went offline', { level: 2, kind: 'Offline', value: 'no telemetry' });
        }
      }
    }

    if (node.sosLatchUntil && now > node.sosLatchUntil) {
      next.sosLatchUntil = null;
      next.sos = 0;
      nodeChanged = true;
    }

    if (node.peakGas && now - node.peakGas.at > 10000) {
      next.peakGas = null;
      nodeChanged = true;
    }

    if (nodeChanged) {
      nodes.set(id, next);
      changed = true;
    }
  }

  if (changed) notify();
}, 500);

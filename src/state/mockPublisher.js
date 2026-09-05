import { updateNode, addEvent } from './nodeStore';

/**
 * Simulated telemetry, used when no MQTT broker is reachable so the dashboard
 * is never a screen of dashes. Scenarios are exported so the UI can trigger
 * them from real buttons instead of undiscoverable keypresses.
 */

export const SCENARIOS = [
  { id: 'idle',  label: 'All clear',      hint: 'Reset every node to normal readings' },
  { id: 'gas',   label: 'Gas leak',       hint: 'Worker 2 gas ramps to warning, then clears' },
  { id: 'fall',  label: 'Fall impact',    hint: 'Worker 1 takes an impact and triggers a fall' },
  { id: 'sos',   label: 'SOS pressed',    hint: 'Worker 3 raises a manual distress call' },
  { id: 'heat',  label: 'Heat build-up',  hint: 'Worker 3 climbs into the emergency temperature band' },
  { id: 'fault', label: 'Sensor fault',   hint: 'Worker 3 climate sensor returns no reading' },
  { id: 'evac',  label: 'Zone evacuation', hint: 'Two shafts go critical at once' },
  { id: 'drop',  label: 'Link loss',      hint: 'Worker 3 stops transmitting' },
];

let running = false;
let timers = [];
let active = { id: 'idle', startedAt: 0 };
let subscribers = new Set();

const noise = (min, max) => min + Math.random() * (max - min);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Smoothed climate state so sparklines drift instead of jittering.
let temp1 = 29.5;
let hum1 = 64;
let temp3 = 29.8;
let hum3 = 68;

const drift = (value, target, rate, jitter) =>
  value + (target - value) * rate + noise(-jitter, jitter);

export function onScenarioChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export const getScenario = () => active.id;

export function setScenario(id) {
  const known = SCENARIOS.find((s) => s.id === id);
  if (!known) return;
  active = { id, startedAt: Date.now() };
  if (id !== 'idle') {
    addEvent(null, `Simulation: ${known.label}`, { level: 0, kind: 'Simulated' });
  }
  subscribers.forEach((fn) => fn(id));
}

export function startMockPublisher() {
  if (running) return;
  running = true;

  // Fast loop: gas, motion and radio, at the cadence of the real firmware.
  timers.push(
    setInterval(() => {
      const now = Date.now();
      const elapsed = now - active.startedAt;
      const evac = active.id === 'evac';

      /* --- WSN-1: full sensor suite ------------------------------------ */
      let gas1 = evac ? 550 : noise(40, 90);
      let accel1 = noise(16100, 16800);
      let fall1 = 0;

      if (active.id === 'fall') {
        if (elapsed < 600) {
          accel1 = 28500;
          fall1 = 1;
        } else if (elapsed < 6000) {
          accel1 = noise(16100, 16900);
          fall1 = 1;
        } else if (elapsed < 6500) {
          fall1 = 0;
          setScenario('idle');
        }
      }

      updateNode('WSN-1', {
        gas_ppm: gas1,
        accel_mag: accel1,
        fall: fall1,
        sos: 0,
        rssi: -62 + noise(-3, 3),
        distance: 3.4,
        hops: 1,
      });

      /* --- WSN-2: gas-only node ---------------------------------------- */
      let gas2 = noise(40, 90);
      if (evac) {
        gas2 = 520;
      } else if (active.id === 'gas') {
        if (elapsed < 4000) gas2 = 60 + 360 * (elapsed / 4000);
        else if (elapsed < 12000) gas2 = 420;
        else if (elapsed < 24000) gas2 = 420 - 360 * ((elapsed - 12000) / 12000);
        else setScenario('idle');
      }

      updateNode('WSN-2', {
        gas_ppm: gas2,
        sos: 0,
        rssi: -67 + noise(-4, 4),
        distance: 5.1,
        hops: 1,
      });

      /* --- WSN-3: climate node ----------------------------------------- */
      if (active.id !== 'drop') {
        const sos3 = active.id === 'sos' ? 1 : 0;
        updateNode('WSN-3', {
          sos: sos3,
          rssi: -74 + noise(-5, 5),
          distance: 8.7,
          hops: 2,
        });
        if (sos3 && elapsed > 800) setScenario('idle');
      }
    }, 500)
  );

  // Slow loop: temperature and humidity move on a 2s cadence.
  timers.push(
    setInterval(() => {
      const elapsed = Date.now() - active.startedAt;

      temp1 = clamp(drift(temp1, 29.5, 0.2, 0.35), 26, 34);
      hum1 = clamp(drift(hum1, 64, 0.2, 1), 55, 75);
      updateNode('WSN-1', { temp: temp1, humidity: hum1 });

      if (active.id === 'drop') return;

      if (active.id === 'fault') {
        if (elapsed < 9000) {
          updateNode('WSN-3', { temp: NaN, humidity: NaN });
          return;
        }
        setScenario('idle');
      }

      if (active.id === 'heat') {
        if (elapsed < 12000) {
          temp3 = 29 + 17 * (elapsed / 12000);
          hum3 = 68 + 20 * (elapsed / 12000);
        } else if (elapsed < 22000) {
          temp3 = 46 + noise(-0.3, 0.3);
          hum3 = 88;
        } else {
          setScenario('idle');
        }
      } else if (active.id === 'evac') {
        temp3 = 47;
        hum3 = 90;
      } else {
        temp3 = clamp(drift(temp3, 29.8, 0.2, 0.35), 26, 34);
        hum3 = clamp(drift(hum3, 68, 0.2, 1), 58, 78);
      }

      updateNode('WSN-3', { temp: temp3, humidity: hum3 });
    }, 2000)
  );
}

export function stopMockPublisher() {
  timers.forEach(clearInterval);
  timers = [];
  running = false;
  active = { id: 'idle', startedAt: 0 };
}

export const isMockRunning = () => running;

import { updateNode } from './nodeStore';

let isMockRunning = false;
let killWsn3 = false;

let scenarios = {
  gasRampWsn2: false,
  gasRampStartTime: 0,
  fallWsn1: false,
  fallStartTime: 0,
  sosWsn3: false,
  zoneEvac: false,
  heatBuildWsn3: false,
  heatStartTime: 0,
  dhtFailWsn3: false,
  dhtFailStartTime: 0,
};

// Reset scenarios
function resetScenarios() {
  scenarios = {
    gasRampWsn2: false,
    gasRampStartTime: 0,
    fallWsn1: false,
    fallStartTime: 0,
    sosWsn3: false,
    zoneEvac: false,
    heatBuildWsn3: false,
    heatStartTime: 0,
    dhtFailWsn3: false,
    dhtFailStartTime: 0,
  };
  killWsn3 = false;
}

// Keyboard triggers
window.addEventListener('keydown', (e) => {
  if (!isMockRunning) return;
  const key = e.key.toLowerCase();
  const now = Date.now();
  switch (key) {
    case '1':
      resetScenarios();
      scenarios.gasRampWsn2 = true;
      scenarios.gasRampStartTime = now;
      break;
    case '2':
      resetScenarios();
      scenarios.fallWsn1 = true;
      scenarios.fallStartTime = now;
      break;
    case '3':
      resetScenarios();
      scenarios.sosWsn3 = true;
      break;
    case '4':
      resetScenarios();
      scenarios.zoneEvac = true;
      break;
    case '5':
      resetScenarios();
      scenarios.heatBuildWsn3 = true;
      scenarios.heatStartTime = now;
      break;
    case '6':
      resetScenarios();
      scenarios.dhtFailWsn3 = true;
      scenarios.dhtFailStartTime = now;
      break;
    case '0':
      resetScenarios();
      break;
    case 'k':
      killWsn3 = true;
      break;
  }
});

// Helper for noise
const noise = (min, max) => min + Math.random() * (max - min);

// State for climate simulation
let lastTempWsn1 = 30;
let lastHumWsn1 = 65;
let lastTempWsn3 = 29.8;
let lastHumWsn3 = 68;

export function startMockPublisher() {
  if (isMockRunning) return;
  isMockRunning = true;

  setInterval(() => {
    const now = Date.now();
    
    // WSN-1 Full Node
    let gas1 = scenarios.zoneEvac ? 550 : noise(40, 90);
    let alert1 = scenarios.zoneEvac ? 3 : 0;
    let accel1 = noise(16000, 18000);
    let fall1 = 0;
    
    if (scenarios.fallWsn1) {
      const elapsed = now - scenarios.fallStartTime;
      if (elapsed < 500) {
        accel1 = 28500;
        fall1 = 1;
        alert1 = 3;
      } else if (elapsed < 3500) {
        accel1 = noise(16000, 18000);
        fall1 = 1;
        alert1 = 3;
      }
    }
    
    updateNode('WSN-1', {
      gas_ppm: gas1,
      accel_mag: accel1,
      fall: fall1,
      sos: 0,
      alert: alert1,
      rssi: -62 + noise(-3, 3),
      distance: 3.4,
      hops: 1,
      ts: performance.now()
    });

    // WSN-2 Gas Node
    let gas2 = noise(40, 90);
    let alert2 = 0;
    
    if (scenarios.gasRampWsn2 || scenarios.zoneEvac) {
      const elapsed = now - scenarios.gasRampStartTime;
      if (scenarios.zoneEvac) {
        gas2 = 520;
        alert2 = 3;
      } else if (elapsed < 4000) {
        gas2 = 60 + (360 * (elapsed / 4000));
      } else if (elapsed < 12000) {
        gas2 = 420;
        alert2 = 2; // Warning
      } else if (elapsed < 27000) {
        gas2 = 420 - (360 * ((elapsed - 12000) / 15000));
      }
    }
    
    updateNode('WSN-2', {
      gas_ppm: gas2,
      sos: 0,
      alert: alert2,
      rssi: -67 + noise(-4, 4),
      distance: 5.1,
      hops: 1,
      ts: performance.now()
    });

    // WSN-3 Climate Node
    if (!killWsn3) {
      let sos3 = scenarios.sosWsn3 ? 1 : 0;
      updateNode('WSN-3', {
        sos: sos3,
        alert: sos3 ? 3 : 0,
        rssi: -74 + noise(-5, 5),
        distance: 8.7,
        hops: 2,
        ts: performance.now()
      });
      if (scenarios.sosWsn3) scenarios.sosWsn3 = false; // Reset after one tick
    }
    
  }, 500);

  // Climate updater (2s cadence)
  setInterval(() => {
    const now = Date.now();
    
    // WSN-1
    lastTempWsn1 = noise(28, 32);
    lastHumWsn1 = noise(60, 70);
    updateNode('WSN-1', { temp: lastTempWsn1, humidity: lastHumWsn1 });
    
    // WSN-3
    if (!killWsn3) {
      if (scenarios.dhtFailWsn3) {
        const elapsed = now - scenarios.dhtFailStartTime;
        if (elapsed < 8000) {
          updateNode('WSN-3', { temp: NaN, humidity: NaN });
          return;
        } else {
          scenarios.dhtFailWsn3 = false;
        }
      }
      
      if (scenarios.heatBuildWsn3) {
        const elapsed = now - scenarios.heatStartTime;
        if (elapsed < 12000) {
          lastTempWsn3 = 29 + (15 * (elapsed / 12000));
          lastHumWsn3 = 68 + (20 * (elapsed / 12000));
        } else if (elapsed < 20000) {
          lastTempWsn3 = 44;
          lastHumWsn3 = 88;
        } else {
          lastTempWsn3 = 29.8;
          lastHumWsn3 = 68;
          scenarios.heatBuildWsn3 = false;
        }
      } else {
        lastTempWsn3 = noise(28, 32);
        lastHumWsn3 = noise(60, 70);
      }
      
      updateNode('WSN-3', { temp: lastTempWsn3, humidity: lastHumWsn3 });
    }
  }, 2000);
}

export function stopMockPublisher() {
  isMockRunning = false;
  // Clear intervals ideally, but for demo it's fine
}

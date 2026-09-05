export const GAS = { CAUTION: 100, WARNING: 300, EMERGENCY: 500, MIN: 0, MAX: 1000 };
export const TEMP = { CAUTION: 35, WARNING: 40, EMERGENCY: 45, MIN: 0, MAX: 60 };
export const HUMID = { MIN: 0, MAX: 100 };

/** Raw MPU accelerometer magnitude, in LSB. 1 g = 16384 LSB at the +/-2 g range. */
export const ACCEL = { NORMAL_LOW: 16000, NORMAL_HIGH: 18000, IMPACT: 25000, MAX: 35000 };
export const G_LSB = 16384;

/** Impact expressed as g-force deviation from rest, which is what an operator reads. */
export const IMPACT = { CAUTION: 0.35, WARNING: 0.6, EMERGENCY: 0.9, MIN: 0, MAX: 1.5 };

export const accelToG = (raw) =>
  raw === null || raw === undefined || Number.isNaN(raw) ? null : Math.abs(raw - G_LSB) / G_LSB;

export const LEVELS = ['SAFE', 'CAUTION', 'WARNING', 'EMERGENCY'];

/** Maps a severity level to the CSS token family used across the UI. */
export const LEVEL_TONE = ['safe', 'caution', 'warning', 'danger'];

export const NODE_REGISTRY = {
  'WSN-1': { label: 'Worker 1', zone: 'Shaft A', caps: ['gas', 'fall', 'temp', 'humidity', 'sos'] },
  'WSN-2': { label: 'Worker 2', zone: 'Shaft B', caps: ['gas', 'sos'] },
  'WSN-3': { label: 'Worker 3', zone: 'Deep Shaft', caps: ['temp', 'humidity', 'sos'] },
};

export const SENSOR_META = {
  gas:      { label: 'Gas',         unit: 'ppm', icon: 'leaf',        tone: 'safe' },
  temp:     { label: 'Temperature', unit: '°C',  icon: 'thermometer', tone: 'caution' },
  humidity: { label: 'Humidity',    unit: '%',   icon: 'drop',        tone: 'info' },
  impact:   { label: 'Impact',      unit: 'g',   icon: 'activity',    tone: 'offline' },
};

/** Link freshness windows, in ms. */
export const LINK = { STALE_AFTER: 2000, OFFLINE_AFTER: 5000 };

/**
 * Gauge display ranges. Deliberately tighter than the sensor's full range so
 * the arc has usable travel in the band operators actually work in; readings
 * past the top clamp and are flagged as over-range.
 */
export const SCALE = {
  gas: { min: 0, max: 600 },
  temp: { min: 0, max: 60 },
  humidity: { min: 0, max: 100 },
  impact: { min: 0, max: 1.5 },
};

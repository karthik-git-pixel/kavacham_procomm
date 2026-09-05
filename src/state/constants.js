export const GAS = { CAUTION: 100, WARNING: 300, EMERGENCY: 500, MAX: 1000 };
export const ACCEL = { NORMAL_LOW: 16000, NORMAL_HIGH: 18000, IMPACT: 25000, MAX: 35000 };
export const TEMP = { CAUTION: 35, WARNING: 40, EMERGENCY: 45, MIN: 0, MAX: 60 };
export const HUMID = { MIN: 0, MAX: 100 };
export const LEVELS = ['SAFE', 'CAUTION', 'WARNING', 'EMERGENCY']; // index = alert level 0-3

export const NODE_REGISTRY = {
  'WSN-1': { label: 'Worker 1', zone: 'Shaft A', caps: ['gas','fall','temp','humidity','sos'] },
  'WSN-2': { label: 'Worker 2', zone: 'Shaft B', caps: ['gas','sos'] },
  'WSN-3': { label: 'Worker 3', zone: 'Deep Shaft', caps: ['temp','humidity','sos'] },
};

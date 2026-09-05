/** Maps RSSI (dBm) to a bar count and an operator-facing quality word. */
export function rssiQuality(rssi) {
  if (rssi === null || rssi === undefined || Number.isNaN(rssi)) {
    return { bars: 0, label: 'No link', tone: 'offline' };
  }
  if (rssi > -55) return { bars: 4, label: 'Excellent', tone: 'safe' };
  if (rssi > -68) return { bars: 3, label: 'Good', tone: 'safe' };
  if (rssi > -80) return { bars: 2, label: 'Fair', tone: 'caution' };
  return { bars: 1, label: 'Weak', tone: 'warning' };
}

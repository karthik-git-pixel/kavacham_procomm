import { GAS, TEMP, IMPACT, accelToG, LEVEL_TONE } from './constants';

const isNum = (v) => v !== null && v !== undefined && !Number.isNaN(v);

/** 0 = safe, 1 = caution, 2 = warning, 3 = emergency. */
export function levelFor(value, thresholds) {
  if (!isNum(value) || !thresholds || !isNum(thresholds.EMERGENCY)) return 0;
  if (value >= thresholds.EMERGENCY) return 3;
  if (value >= thresholds.WARNING) return 2;
  if (value >= thresholds.CAUTION) return 1;
  return 0;
}

export const toneFor = (level) => LEVEL_TONE[Math.max(0, Math.min(3, level || 0))];

/**
 * Derives a node's severity from its own readings rather than trusting the
 * firmware `alert` field alone, so the banner, the map and the gauges can never
 * disagree about how bad a worker's situation is.
 *
 * Returns the level plus the human-readable reasons behind it — an operator
 * should never have to hunt for *why* a card turned red.
 */
export function nodeSeverity(node) {
  if (!node) return { level: 0, reasons: [], offline: true };

  const offline = node.link === 'offline';
  const reasons = [];
  let level = 0;

  const bump = (lvl, text) => {
    if (lvl > 0) reasons.push({ level: lvl, text });
    if (lvl > level) level = lvl;
  };

  // A live SOS or fall outranks any sensor reading.
  if (node.sos || node.sosLatchUntil) bump(3, 'SOS pressed');
  if (node.fall) bump(3, 'Fall detected');

  if (!offline) {
    const gasLevel = levelFor(node.gas_ppm, GAS);
    if (gasLevel) bump(gasLevel, `Gas ${Math.round(node.gas_ppm)} ppm`);

    const tempLevel = levelFor(node.temp, TEMP);
    if (tempLevel) bump(tempLevel, `Temperature ${node.temp.toFixed(1)} °C`);

    const g = accelToG(node.accel_mag);
    const impactLevel = levelFor(g, IMPACT);
    if (impactLevel) bump(impactLevel, `Impact ${g.toFixed(2)} g`);
  }

  // Trust the firmware when it reports something the sensors do not explain.
  if (isNum(node.alert) && node.alert > level && !offline) {
    bump(node.alert, `Node reported alert level ${node.alert}`);
  }

  if (offline) reasons.push({ level: 0, text: 'Link lost' });

  reasons.sort((a, b) => b.level - a.level);
  return { level: offline ? 0 : level, reasons, offline };
}

/**
 * Site-wide posture. Two or more nodes in emergency means the hazard is not
 * local to one worker, which is the trigger for a zone evacuation call.
 */
export function siteSeverity(nodes) {
  const list = Object.values(nodes || {});
  let level = 0;
  let emergencies = 0;
  const critical = [];

  list.forEach((node) => {
    const sev = nodeSeverity(node);
    if (sev.level > level) level = sev.level;
    if (sev.level >= 3) {
      emergencies += 1;
      critical.push({ node, sev });
    }
  });

  return { level, evacuate: emergencies >= 2, critical, emergencies };
}

/** "12s ago" / "3m ago" — relative time reads faster than a wall clock. */
export function relTime(ts, now = Date.now()) {
  if (!ts) return 'never';
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 2) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

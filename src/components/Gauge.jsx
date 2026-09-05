import React from 'react';
import { toneFor } from '../state/severity';
import './Gauge.css';

const STATUS = ['Normal', 'Caution', 'Warning', 'Emergency'];

/**
 * Semi-circular gauge with threshold ticks.
 *
 * The ticks matter: a colour alone says "you are fine", but the tick marks say
 * *how much headroom is left* before caution, warning and emergency — which is
 * the question an operator is actually asking.
 */
export default function Gauge({
  value,
  min = 0,
  max = 100,
  thresholds,
  level = 0,
  unit,
  size = 108,
  stale = false,
  disabled = false,
  peak = null,
}) {
  const invalid = disabled || value === null || value === undefined || Number.isNaN(value);

  const stroke = 9;
  const w = size;
  const h = size / 2 + stroke;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = h - stroke / 2;
  const arcLen = Math.PI * r;

  const frac = (v) => {
    if (max === min) return 0;
    return Math.min(1, Math.max(0, (v - min) / (max - min)));
  };

  const pct = invalid ? 0 : frac(value);
  const overRange = !invalid && value > max;
  const tone = invalid ? 'offline' : toneFor(level);
  const color = `var(--${tone === 'offline' ? 'text-3' : tone})`;

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // Point on the arc for a given 0..1 fraction.
  const pointAt = (f, radius) => {
    const a = Math.PI - f * Math.PI;
    return [cx + Math.cos(a) * radius, cy - Math.sin(a) * radius];
  };

  const ticks = [];
  if (thresholds && !invalid) {
    [
      ['CAUTION', 'caution'],
      ['WARNING', 'warning'],
      ['EMERGENCY', 'danger'],
    ].forEach(([key, toneName]) => {
      const t = thresholds[key];
      if (t === undefined || t === null || t > max) return;
      const f = frac(t);
      const [x1, y1] = pointAt(f, r - stroke / 2 - 1);
      const [x2, y2] = pointAt(f, r + stroke / 2 + 1);
      ticks.push(
        <line
          key={key}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={`var(--${toneName})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
        />
      );
    });
  }

  let peakMark = null;
  if (peak && !invalid && peak.value > value) {
    const f = frac(peak.value);
    const [px, py] = pointAt(f, r);
    peakMark = <circle cx={px} cy={py} r="2.75" fill={color} opacity="0.85" />;
  }

  const display = invalid
    ? '--'
    : Math.abs(value) >= 100
      ? Math.round(value).toString()
      : value.toFixed(Math.abs(value) < 10 ? 2 : 1).replace(/\.?0+$/, '') || '0';

  return (
    <div className={`gauge ${stale ? 'is-stale' : ''} ${invalid ? 'is-off' : ''}`} style={{ width: w }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="presentation">
        <path d={arcPath} fill="none" stroke="var(--surface-inset)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={arcLen - pct * arcLen}
          className="gauge-fill"
        />
        {ticks}
        {peakMark}
      </svg>

      <div className="gauge-readout">
        <span className="gauge-value tnum" style={{ color: invalid ? 'var(--text-3)' : 'var(--text)' }}>
          {display}
          {overRange && <span className="gauge-over">+</span>}
        </span>
        <span className="gauge-unit">{unit}</span>
      </div>

      <div className="gauge-status" style={{ color: invalid ? 'var(--text-3)' : color }}>
        {invalid ? (disabled ? 'No sensor' : 'No data') : STATUS[level]}
      </div>
    </div>
  );
}

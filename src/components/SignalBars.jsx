import React from 'react';
import { rssiQuality } from '../state/signal';
import './SignalBars.css';

export default function SignalBars({ rssi, disabled = false, size = 14 }) {
  const { bars, tone } = disabled ? { bars: 0, tone: 'offline' } : rssiQuality(rssi);

  return (
    <span className="bars" style={{ height: size, color: `var(--${tone})` }}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`bar ${i <= bars ? 'on' : ''}`}
          style={{ height: `${25 * i}%` }}
        />
      ))}
    </span>
  );
}

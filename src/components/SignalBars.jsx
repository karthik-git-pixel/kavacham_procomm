import React from 'react';
import './SignalBars.css';

export default function SignalBars({ rssi = -100, disabled = false }) {
  let bars = 0;
  if (!disabled) {
    if (rssi > -50) bars = 4;
    else if (rssi > -65) bars = 3;
    else if (rssi > -80) bars = 2;
    else bars = 1;
  }

  return (
    <div className={`signal-bars ${disabled ? 'disabled' : ''}`}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`bar ${i <= bars ? 'filled' : ''}`} style={{ height: `${20 + i * 20}%` }} />
      ))}
    </div>
  );
}

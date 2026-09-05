import React, { useState, useEffect } from 'react';
import './ConnectionStrip.css';

export default function ConnectionStrip({ isMockData = false, brokerUrl = '', muted, setMuted }) {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="connection-strip">
      <div className="strip-left">
        <span className="broker-url">{isMockData ? 'mock publisher (simulated)' : brokerUrl}</span>
        <span className="divider">|</span>
        <span className={`conn-state ${isMockData ? 'simulated' : 'live'}`}>
          <span className="dot">●</span> {isMockData ? 'simulated' : 'live'}
        </span>
      </div>
      <div className="strip-right">
        <span className="uptime tabular-nums">Uptime: {formatUptime(uptime)}</span>
        <span className="divider">|</span>
        <label className="audio-toggle">
          <input type="checkbox" checked={!muted} onChange={(e) => setMuted(!e.target.checked)} />
          Audio: {muted ? 'Muted' : 'On'}
        </label>
      </div>
    </div>
  );
}

import React from 'react';
import Gauge from './Gauge';
import SignalBars from './SignalBars';
import { GAS, ACCEL, TEMP, HUMID, LEVELS } from '../state/constants';
import './WorkerCard.css';

export default function WorkerCard({ node }) {
  const { 
    id, label, zone, caps, 
    gas_ppm, temp, humidity, accel_mag, fall, sos, alert = 0, sosLatchUntil, 
    rssi, distance, hops, 
    lastSeen, link, peakGas, history = []
  } = node;

  const isOffline = link === 'offline';
  const isStale = link === 'stale';
  const hasGas = caps.includes('gas');
  const hasTemp = caps.includes('temp');
  const hasHumid = caps.includes('humidity');
  const hasFall = caps.includes('fall');

  // Age formatting
  const age = lastSeen ? Math.floor((Date.now() - lastSeen) / 100) / 10 : 0;
  
  const renderPip = (capName, label) => {
    const present = caps.includes(capName);
    return (
      <span className={`pip ${present ? 'active' : 'inactive'}`}>
        {present ? '●' : '○'} {label}
      </span>
    );
  };

  return (
    <div className={`glass-card worker-card ${isOffline ? 'offline' : ''}`}>
      <div className="worker-card-header">
        <div className="worker-card-title-row">
          <div className="worker-card-name">
            <span className={`status-dot ${isOffline ? 'offline' : 'online'}`}></span>
            <span className="name-text">{label}</span>
          </div>
          <div className="worker-card-zone">{zone}</div>
          <div className={`worker-card-badge ${isOffline ? 'offline' : 'online'}`}>
            {isOffline ? 'Offline' : 'Online'}
          </div>
        </div>
        <div className="worker-card-pips">
          {renderPip('gas', 'Gas')} · {renderPip('fall', 'Impact')} · {renderPip('temp', 'Temp')} · {renderPip('humidity', 'Humidity')} · {renderPip('sos', 'SOS')}
        </div>
      </div>

      <div className="worker-card-gauges">
        <div className="gauge-cell">
          <Gauge 
            value={gas_ppm} min={0} max={GAS.MAX} thresholds={GAS} 
            unit="ppm" label="Gas" size={100} 
            stale={isStale} disabled={!hasGas || isOffline} peakHold={peakGas}
          />
        </div>
        <div className="gauge-cell">
          <Gauge 
            value={temp} min={TEMP.MIN} max={TEMP.MAX} thresholds={TEMP} 
            unit="°C" label="Temperature" size={100} 
            stale={isStale || Number.isNaN(temp)} disabled={!hasTemp || isOffline}
          />
        </div>
        <div className="gauge-cell">
          <Gauge 
            value={humidity} min={HUMID.MIN} max={HUMID.MAX} thresholds={HUMID} 
            unit="%" label="Humidity" size={100} 
            stale={isStale || Number.isNaN(humidity)} disabled={!hasHumid || isOffline}
          />
        </div>
        <div className="gauge-cell">
           <Gauge 
            value={fall ? 100 : (accel_mag ? (accel_mag / 1000) : 0)} min={0} max={ACCEL.MAX / 1000} thresholds={{CAUTION:16, WARNING:20, EMERGENCY:30, MAX:35}} 
            unit="g" label="Impact" size={100} 
            stale={isStale || Number.isNaN(accel_mag)} disabled={!hasFall || isOffline}
          />
        </div>
      </div>

      <div className="worker-card-footer">
        <div className="footer-metric">
          <SignalBars rssi={rssi} disabled={isOffline} />
          <span className="footer-label">Signal</span>
          <span className="footer-value">{isOffline ? '--' : rssi} dBm</span>
        </div>
        <div className="footer-metric">
          <span className="footer-icon">📍</span>
          <span className="footer-label">Distance</span>
          <span className="footer-value">{isOffline ? '--' : distance} m</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import Gauge from './Gauge';
import Sparkline from './Sparkline';
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

  // Determine card border/pulse state
  const stateLevel = alert;
  const stateColors = ['var(--safe)', 'var(--caution)', 'var(--warning)', 'var(--danger)'];
  const cardColor = isOffline ? 'var(--rule)' : stateColors[stateLevel];
  
  const pulseClass = (stateLevel === 3 && !isOffline) ? 'pulse-border' : '';
  const cardClass = `worker-card ${isOffline ? 'offline' : ''} ${pulseClass}`;

  // Age formatting
  const age = lastSeen ? Math.floor((Date.now() - lastSeen) / 100) / 10 : 0;
  const ageStr = isOffline ? 'offline' : `${age.toFixed(1)}s`;
  const ageColor = isOffline ? 'var(--danger)' : age > 2 ? 'var(--caution)' : 'var(--safe)';

  // Primary gauge logic
  let PrimaryGauge = null;
  if (hasGas) {
    PrimaryGauge = (
      <Gauge 
        value={gas_ppm} min={0} max={GAS.MAX} thresholds={GAS} 
        unit="ppm (rel.)" label="gas" size={240} 
        stale={isStale} disabled={isOffline} peakHold={peakGas}
      />
    );
  } else if (hasTemp) {
    PrimaryGauge = (
      <Gauge 
        value={temp} min={TEMP.MIN} max={TEMP.MAX} thresholds={TEMP} 
        unit="°C" label="temperature" size={240} 
        stale={isStale || Number.isNaN(temp)} disabled={isOffline}
      />
    );
  } else {
    // Fallback socket
    PrimaryGauge = <Gauge disabled={true} label="no primary sensor" size={240} />;
  }

  // Coverage Strip helpers
  const renderPip = (capName, label) => {
    const present = caps.includes(capName);
    return (
      <span className="coverage-pip" title={present ? `${label} sensor present` : `no ${label} sensor on this node`}>
        {present ? '●' : '⊘'} {label}
      </span>
    );
  };

  // Sparkline data extraction
  const extractHistory = (key) => history.map(h => h[key]).filter(v => v !== undefined);

  return (
    <div className={cardClass} style={{ borderColor: cardColor }}>
      {/* Slot 1: Header */}
      <div className="card-header">
        <div className="header-top">
          <div className="worker-info">
            <span className="state-dot" style={{ backgroundColor: cardColor }}></span>
            <span className="worker-label">{label}</span>
          </div>
          <div className="zone-info">{zone}</div>
          <div className="packet-age tabular-nums" style={{ color: ageColor }}>{ageStr}</div>
        </div>
        <div className="coverage-strip">
          {renderPip('gas', 'gas')} · {renderPip('fall', 'impact')} · {renderPip('temp', 'temp')} · {renderPip('humidity', 'humid')} · {renderPip('sos', 'sos')}
        </div>
      </div>

      {/* Slot 2: Primary Gauge */}
      <div className="card-primary">
        {PrimaryGauge}
      </div>

      {/* Slot 3: Climate Row */}
      <div className="card-row climate-row">
        {/* compact gauge left */}
        <div className="climate-left">
          {hasTemp && hasGas ? (
            <Gauge 
              value={temp} min={TEMP.MIN} max={TEMP.MAX} thresholds={TEMP}
              unit="°C" label="temperature" size={150} variant="compact"
              stale={isStale || Number.isNaN(temp)} disabled={isOffline}
            />
          ) : hasHumid ? (
            <Gauge 
              value={humidity} min={HUMID.MIN} max={HUMID.MAX} thresholds={HUMID}
              unit="%" label="humidity" size={150} variant="compact"
              stale={isStale || Number.isNaN(humidity)} disabled={isOffline}
            />
          ) : (
            <div className="socket-gauge">
              <Gauge disabled={true} label="no climate sensor" size={150} variant="compact" />
            </div>
          )}
        </div>
        {/* readout right */}
        <div className="climate-right">
          <div className="metric-header">
            {hasTemp && !hasGas ? 'Temperature' : 'Humidity'}
          </div>
          <div className="metric-body">
            {hasTemp && !hasGas ? (
              <div className="metric-value tabular-nums">
                {isOffline || !hasTemp || Number.isNaN(temp) ? '—' : temp?.toFixed(1)} <span className="unit">°C</span>
              </div>
            ) : hasHumid ? (
              <>
                <div className="metric-value tabular-nums">
                  {isOffline || Number.isNaN(humidity) ? '—' : humidity?.toFixed(0)} <span className="unit">%</span>
                </div>
                {!isOffline && !Number.isNaN(humidity) ? (
                  <Sparkline data={extractHistory('humidity')} width={80} height={24} min={HUMID.MIN} max={HUMID.MAX} />
                ) : (
                  <div className="socket-line"></div>
                )}
              </>
            ) : (
              <div className="socket-readout">
                <div className="metric-value tabular-nums">—</div>
                <div className="socket-line"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slot 4: Motion Row */}
      <div className="card-row motion-row">
        <div className="motion-left">
          <div className="metric-header">Impact</div>
          <div className="metric-body motion-body">
            {hasFall && !isOffline ? (
              <>
                <div className="metric-value tabular-nums small">{accel_mag?.toLocaleString()}</div>
                <Sparkline data={extractHistory('accel')} width={60} height={20} min={10000} max={ACCEL.MAX} threshold={ACCEL.IMPACT} />
              </>
            ) : (
              <div className="socket-readout horizontal">
                <div className="metric-value tabular-nums small">—</div>
                <div className="socket-line"></div>
              </div>
            )}
          </div>
        </div>
        <div className="motion-right">
          <div className="metric-header">Fall</div>
          <div className="metric-body">
            {hasFall && !isOffline ? (
              <div className="metric-value small">{fall ? 'DETECTED' : 'clear'}</div>
            ) : (
              <div className="metric-value small socket-text">—</div>
            )}
          </div>
        </div>
      </div>

      {/* Slot 5: Footer */}
      <div className="card-footer">
        <div className="link-info">
          Signal <SignalBars rssi={rssi} disabled={isOffline} /> {isOffline ? '—' : rssi} <span className="divider">·</span> Distance {isOffline ? '—' : distance} m <span className="divider">·</span> {isOffline ? '—' : hops} {hops === 1 ? 'hop' : 'hops'}
        </div>
        <div className="sos-level-row">
          <div className={`sos-status ${sosLatchUntil ? 'active' : ''}`}>
            SOS <span className="sos-val">{sosLatchUntil ? 'HELD' : 'idle'}</span>
          </div>
          <div className="level-status" style={{ color: cardColor }}>
            Level {stateLevel}
          </div>
        </div>
      </div>
    </div>
  );
}

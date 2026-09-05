import React from 'react';
import Gauge from './Gauge';
import Sparkline from './Sparkline';
import SignalBars from './SignalBars';
import { rssiQuality } from '../state/signal';
import Icon from './Icon';
import { GAS, TEMP, IMPACT, SCALE, accelToG } from '../state/constants';
import { levelFor, nodeSeverity, toneFor, relTime } from '../state/severity';
import './WorkerCard.css';

const LEVEL_LABEL = ['Normal', 'Caution', 'Warning', 'Emergency'];

function sensorSet(node) {
  const caps = node.caps || [];
  const g = accelToG(node.accel_mag);

  return [
    {
      key: 'gas',
      enabled: caps.includes('gas'),
      icon: 'leaf',
      label: 'Gas',
      unit: 'ppm',
      value: node.gas_ppm,
      thresholds: GAS,
      scale: SCALE.gas,
      series: (node.history || []).map((h) => h.gas),
      peak: node.peakGas,
    },
    {
      key: 'temp',
      enabled: caps.includes('temp'),
      icon: 'thermometer',
      label: 'Temp',
      unit: '°C',
      value: node.temp,
      thresholds: TEMP,
      scale: SCALE.temp,
      series: (node.history || []).map((h) => h.temp),
    },
    {
      key: 'humidity',
      enabled: caps.includes('humidity'),
      icon: 'drop',
      label: 'Humidity',
      unit: '%',
      value: node.humidity,
      thresholds: null,
      scale: SCALE.humidity,
      series: (node.history || []).map((h) => h.humidity),
    },
    {
      key: 'impact',
      enabled: caps.includes('fall'),
      icon: 'activity',
      label: 'Impact',
      unit: 'g',
      value: g,
      thresholds: IMPACT,
      scale: SCALE.impact,
      series: (node.history || []).map((h) => accelToG(h.accel)),
    },
  ];
}

const fmt = (v, key) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '--';
  if (key === 'impact') return v.toFixed(2);
  if (key === 'temp') return v.toFixed(1);
  return Math.round(v).toString();
};

export default function WorkerCard({ node, selected, onSelect, now }) {
  if (!node) return null;

  const sev = nodeSeverity(node);
  const offline = node.link === 'offline';
  const stale = node.link === 'stale';
  const tone = offline ? 'offline' : toneFor(sev.level);
  const sensors = sensorSet(node);
  const signal = rssiQuality(node.rssi);
  const sos = Boolean(node.sos || node.sosLatchUntil);

  const statusText = offline ? 'Offline' : stale ? 'Stale' : LEVEL_LABEL[sev.level];
  const topReason = sev.reasons[0];

  return (
    <article
      className={`wcard tone-${tone} ${selected ? 'is-selected' : ''} ${offline ? 'is-offline' : ''} ${sev.level >= 3 ? 'is-critical' : ''}`}
      aria-label={`${node.label}, ${node.zone}, ${statusText}`}
    >
      {/* The whole header is the hit target: click selects and expands. */}
      <button
        type="button"
        className="wcard-head"
        onClick={() => onSelect(selected ? null : node.id)}
        aria-expanded={selected}
        aria-controls={`detail-${node.id}`}
      >
        <span className={`wcard-status-dot ${!offline && sev.level === 0 ? 'dot-live' : ''}`} style={{ color: `var(--${tone}-solid, var(--${tone}))` }}>
          <span className="dot dot-lg" />
        </span>

        <span className="wcard-id">
          <span className="wcard-name">{node.label}</span>
          <span className="wcard-zone">{node.zone}</span>
        </span>

        <span className="wcard-head-right">
          {sos && (
            <span className="chip chip-danger wcard-sos">
              <Icon name="siren" size={12} /> SOS
            </span>
          )}
          <span className={`chip chip-${tone === 'offline' ? 'offline' : tone}`}>{statusText}</span>
          <Icon name="chevron" size={16} className={`wcard-caret ${selected ? 'open' : ''}`} />
        </span>
      </button>

      {/* One line that says why the card is the colour it is. */}
      {(topReason || offline) && (
        <p className={`wcard-reason ${offline ? 'muted' : ''}`}>
          {offline
            ? `No telemetry — last seen ${relTime(node.lastSeen, now)}`
            : topReason.text}
        </p>
      )}

      <div className="wcard-strip" role="list">
        {sensors.map((s) => {
          const missing = !s.enabled;
          const invalid = missing || s.value === null || s.value === undefined || Number.isNaN(s.value) || offline;
          const level = invalid ? 0 : levelFor(s.value, s.thresholds);
          const sTone = invalid ? 'offline' : toneFor(level);

          return (
            <div
              key={s.key}
              role="listitem"
              className={`sensor ${invalid ? 'is-invalid' : ''} ${level > 0 ? 'is-alert' : ''}`}
              style={{ '--tone': `var(--${sTone === 'offline' ? 'text-3' : sTone})` }}
              title={missing ? `${s.label}: sensor not fitted on this node` : `${s.label}: ${fmt(s.value, s.key)} ${s.unit}`}
            >
              <span className="sensor-top">
                <Icon name={s.icon} size={12} />
                <span className="sensor-label">{s.label}</span>
              </span>
              <span className="sensor-value tnum">
                {fmt(invalid ? null : s.value, s.key)}
                <span className="sensor-unit">{missing ? '' : s.unit}</span>
              </span>
              <Sparkline
                data={invalid ? [] : s.series}
                min={s.scale.min}
                max={s.scale.max}
                height={20}
                color={`var(--${sTone === 'offline' ? 'text-3' : sTone})`}
                disabled={invalid}
              />
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="wcard-detail" id={`detail-${node.id}`}>
          <div className="wcard-gauges">
            {sensors.map((s) => {
              const invalid = !s.enabled || s.value === null || s.value === undefined || Number.isNaN(s.value) || offline;
              return (
                <div key={s.key} className="gauge-cell">
                  <span className="gauge-cell-label">
                    <Icon name={s.icon} size={12} /> {s.label}
                  </span>
                  <Gauge
                    value={s.value}
                    min={s.scale.min}
                    max={s.scale.max}
                    thresholds={s.thresholds}
                    level={invalid ? 0 : levelFor(s.value, s.thresholds)}
                    unit={s.unit}
                    size={110}
                    stale={stale}
                    disabled={!s.enabled || offline}
                    peak={s.peak}
                  />
                </div>
              );
            })}
          </div>

          {sev.reasons.length > 1 && (
            <ul className="wcard-reasons">
              {sev.reasons.map((r, i) => (
                <li key={i} className={`tone-${toneFor(r.level)}`}>
                  <span className="dot" style={{ color: `var(--${toneFor(r.level)})` }} />
                  {r.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <footer className="wcard-foot">
        <span className="foot-item" title={offline || node.rssi == null ? 'No link' : `${signal.label} · RSSI ${Math.round(node.rssi)} dBm`}>
          <SignalBars rssi={node.rssi} disabled={offline} />
          <span className="foot-label">{offline ? 'Signal' : signal.label}</span>
          <span className="foot-value tnum">{offline || node.rssi == null ? '--' : `${Math.round(node.rssi)} dBm`}</span>
        </span>

        <span className="foot-item">
          <Icon name="pin" size={13} />
          <span className="foot-label">Distance</span>
          <span className="foot-value tnum">{offline || node.distance == null ? '--' : `${node.distance} m`}</span>
        </span>

        <span className="foot-item foot-age" title="Time since the last packet from this node">
          <Icon name="clock" size={13} />
          <span className="foot-value tnum">{relTime(node.lastSeen, now)}</span>
        </span>
      </footer>
    </article>
  );
}

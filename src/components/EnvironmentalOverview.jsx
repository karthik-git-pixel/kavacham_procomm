import React from 'react';
import Icon from './Icon';
import { GAS, TEMP, IMPACT, SCALE, accelToG } from '../state/constants';
import { levelFor, toneFor } from '../state/severity';
import './Summary.css';

const isNum = (v) => v !== null && v !== undefined && !Number.isNaN(v);

/** Average across reporting nodes, plus the worst single reading and who owns it. */
function aggregate(list, pick) {
  let sum = 0;
  let count = 0;
  let worst = null;
  let worstNode = null;

  list.forEach((n) => {
    if (n.link === 'offline') return;
    const v = pick(n);
    if (!isNum(v)) return;
    sum += v;
    count += 1;
    if (worst === null || v > worst) {
      worst = v;
      worstNode = n;
    }
  });

  return { avg: count ? sum / count : null, worst, worstNode, count };
}

function Meter({ value, scale, thresholds, tone }) {
  const pct = value === null ? 0 : Math.min(100, Math.max(0, ((value - scale.min) / (scale.max - scale.min)) * 100));

  const ticks = thresholds
    ? ['CAUTION', 'WARNING', 'EMERGENCY']
        .filter((k) => isNum(thresholds[k]) && thresholds[k] <= scale.max)
        .map((k) => ({
          key: k,
          left: ((thresholds[k] - scale.min) / (scale.max - scale.min)) * 100,
          tone: { CAUTION: 'caution', WARNING: 'warning', EMERGENCY: 'danger' }[k],
        }))
    : [];

  return (
    <div className="meter" aria-hidden="true">
      <div className="meter-fill" style={{ width: `${pct}%`, background: `var(--${tone})` }} />
      {ticks.map((t) => (
        <span key={t.key} className="meter-tick" style={{ left: `${t.left}%`, background: `var(--${t.tone})` }} />
      ))}
    </div>
  );
}

export default function EnvironmentalOverview({ nodes }) {
  const list = Object.values(nodes || {});

  const metrics = [
    {
      key: 'gas',
      label: 'Gas',
      icon: 'leaf',
      unit: 'ppm',
      thresholds: GAS,
      scale: SCALE.gas,
      agg: aggregate(list, (n) => n.gas_ppm),
      fmt: (v) => Math.round(v),
    },
    {
      key: 'temp',
      label: 'Temperature',
      icon: 'thermometer',
      unit: '°C',
      thresholds: TEMP,
      scale: SCALE.temp,
      agg: aggregate(list, (n) => n.temp),
      fmt: (v) => v.toFixed(1),
    },
    {
      key: 'humidity',
      label: 'Humidity',
      icon: 'drop',
      unit: '%',
      thresholds: null,
      scale: SCALE.humidity,
      agg: aggregate(list, (n) => n.humidity),
      fmt: (v) => Math.round(v),
    },
    {
      key: 'impact',
      label: 'Peak impact',
      icon: 'activity',
      unit: 'g',
      thresholds: IMPACT,
      scale: SCALE.impact,
      agg: aggregate(list, (n) => accelToG(n.accel_mag)),
      fmt: (v) => v.toFixed(2),
      usePeak: true,
    },
  ];

  return (
    <section className="card sum" aria-label="Environmental overview">
      <header className="card-head">
        <h2 className="card-title">Environmental Overview</h2>
      </header>

      <ul className="env-list">
        {metrics.map((m) => {
          const shown = m.usePeak ? m.agg.worst : m.agg.avg;
          const has = isNum(shown);
          const level = has ? levelFor(shown, m.thresholds) : 0;
          const tone = has ? toneFor(level) : 'text-3';

          return (
            <li key={m.key} className="env-row">
              <span className="env-icon" style={{ color: `var(--${has && level ? tone : 'text-3'})` }}>
                <Icon name={m.icon} size={15} />
              </span>

              <span className="env-main">
                <span className="env-top">
                  <span className="env-label">{m.label}</span>
                  <span className="env-value tnum" style={{ color: has && level ? `var(--${tone})` : 'var(--text)' }}>
                    {has ? m.fmt(shown) : '--'}
                    <span className="env-unit">{m.unit}</span>
                  </span>
                </span>

                <Meter value={has ? shown : null} scale={m.scale} thresholds={m.thresholds} tone={tone} />

                <span className="env-foot">
                  {m.agg.count === 0
                    ? 'No node reporting'
                    : m.usePeak
                      ? `Highest of ${m.agg.count} node${m.agg.count > 1 ? 's' : ''}${m.agg.worstNode ? ` · ${m.agg.worstNode.label}` : ''}`
                      : `Average of ${m.agg.count} node${m.agg.count > 1 ? 's' : ''}${
                          isNum(m.agg.worst) && m.agg.count > 1 ? ` · peak ${m.fmt(m.agg.worst)}${m.unit}` : ''
                        }`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

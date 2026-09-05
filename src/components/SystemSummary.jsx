import React from 'react';
import Icon from './Icon';
import { nodeSeverity, siteSeverity } from '../state/severity';
import './Summary.css';

const HEADLINE = [
  { text: 'All systems operational', tone: 'safe', icon: 'check' },
  { text: 'Caution — elevated readings', tone: 'caution', icon: 'alert' },
  { text: 'Warning — action required', tone: 'warning', icon: 'alert' },
  { text: 'Emergency — respond now', tone: 'danger', icon: 'siren' },
];

export default function SystemSummary({ nodes }) {
  const list = Object.values(nodes || {});
  const online = list.filter((n) => n.link !== 'offline').length;
  const offline = list.length - online;
  const alerts = list.filter((n) => nodeSeverity(n).level > 0).length;
  const site = siteSeverity(nodes);

  // Offline nodes are their own problem even when nothing is alarming.
  const headline = offline > 0 && site.level === 0
    ? { text: `${offline} node${offline > 1 ? 's' : ''} not reporting`, tone: 'offline', icon: 'wifiOff' }
    : HEADLINE[site.level];

  const tiles = [
    { key: 'total', label: 'Total workers', value: list.length, icon: 'users', tone: 'info' },
    { key: 'online', label: 'Online', value: online, icon: 'user', tone: 'safe' },
    { key: 'offline', label: 'Offline', value: offline, icon: 'userOff', tone: offline ? 'danger' : 'offline' },
    { key: 'alert', label: 'Active alerts', value: alerts, icon: 'alert', tone: alerts ? 'warning' : 'offline' },
  ];

  return (
    <section className="card sum" aria-label="System status">
      <header className="card-head">
        <h2 className="card-title">System Status</h2>
      </header>

      <div className={`sum-headline tone-${headline.tone}`} role="status">
        <Icon name={headline.icon} size={15} />
        <span>{headline.text}</span>
      </div>

      <div className="sum-grid">
        {tiles.map((t) => (
          <div
            key={t.key}
            className={`sum-tile ${t.value > 0 && (t.key === 'offline' || t.key === 'alert') ? 'is-hot' : ''}`}
            style={{ '--tone': `var(--${t.tone})`, '--tone-tint': `var(--${t.tone}-tint)` }}
          >
            <span className="sum-tile-icon"><Icon name={t.icon} size={16} /></span>
            <span className="sum-tile-body">
              <span className="sum-tile-value tnum">{t.value}</span>
              <span className="sum-tile-label">{t.label}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

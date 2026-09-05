import React from 'react';
import Icon from './Icon';
import ConnectionMenu from './ConnectionMenu';
import helmetLogo from '../assets/wowhelmet.png';
import './TopNav.css';

const TABS = [
  { id: 'live', label: 'Live Monitor', icon: 'activity', ready: true },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'workers', label: 'Workers', icon: 'users' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function TopNav({
  conn,
  now,
  alertCount,
  muted,
  onToggleMute,
  theme,
  onToggleTheme,
  onOpenHelp,
  onJumpToAlert,
}) {
  const date = new Date(now);

  return (
    <header className="tnav">
      <div className="tnav-brand">
        <img src={helmetLogo} alt="" className="tnav-logo" />
        <div className="tnav-brand-text">
          <span className="tnav-title">KAVACHAM</span>
          <span className="tnav-sub">Real-time underground monitoring</span>
        </div>
      </div>

      <nav className="tnav-tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tnav-tab ${t.ready ? 'active' : ''}`}
            aria-current={t.ready ? 'page' : undefined}
            disabled={!t.ready}
            title={t.ready ? undefined : `${t.label} — not available yet`}
          >
            <Icon name={t.icon} size={15} />
            <span>{t.label}</span>
            {!t.ready && <span className="tnav-soon">Soon</span>}
          </button>
        ))}
      </nav>

      <div className="tnav-right">
        <ConnectionMenu conn={conn} now={now} />

        <div className="tnav-clock" aria-label="Current time">
          <span className="tnav-time tnum">
            {date.toLocaleTimeString('en-GB', { hour12: false })}
          </span>
          <span className="tnav-date">
            {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="tnav-actions">
          <button
            type="button"
            className="btn btn-icon btn-ghost tnav-bell"
            onClick={onJumpToAlert}
            aria-label={alertCount ? `${alertCount} active alerts` : 'No active alerts'}
            title={alertCount ? `${alertCount} active alert${alertCount > 1 ? 's' : ''}` : 'No active alerts'}
          >
            <Icon name="bell" size={16} />
            {alertCount > 0 && <span className="tnav-badge tnum">{alertCount}</span>}
          </button>

          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={onToggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute alarm audio' : 'Mute alarm audio'}
            title={muted ? 'Alarm audio off' : 'Alarm audio on'}
          >
            <Icon name={muted ? 'volumeOff' : 'volume'} size={16} />
          </button>

          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={onOpenHelp}
            aria-label="Keyboard shortcuts and help"
            title="Help and keyboard shortcuts (press ?)"
          >
            <Icon name="help" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

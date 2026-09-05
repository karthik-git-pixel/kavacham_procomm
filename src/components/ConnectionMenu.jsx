import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { SCENARIOS, setScenario, getScenario } from '../state/mockPublisher';
import { setDemoMode } from '../state/connection';
import './ConnectionMenu.css';

const STATE_META = {
  connecting:   { label: 'Connecting…', tone: 'caution', icon: 'wifi' },
  live:         { label: 'Broker live', tone: 'safe',    icon: 'wifi' },
  reconnecting: { label: 'Reconnecting…', tone: 'caution', icon: 'wifi' },
  demo:         { label: 'Demo data',   tone: 'info',    icon: 'play' },
};

const fmtUptime = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export default function ConnectionMenu({ conn, now }) {
  const [open, setOpen] = useState(false);
  const [scenario, setLocalScenario] = useState(getScenario());
  const ref = useRef(null);

  const meta = STATE_META[conn.mode] || STATE_META.connecting;
  const demo = conn.mode === 'demo';

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => {
    setScenario(id);
    setLocalScenario(id);
  };

  return (
    <div className="connmenu" ref={ref}>
      <button
        type="button"
        className={`connpill tone-${meta.tone}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={`dot ${conn.mode === 'live' ? 'dot-live' : ''}`} />
        <span className="connpill-label">{meta.label}</span>
        <Icon name="chevron" size={13} />
      </button>

      {open && (
        <div className="connpanel card" role="dialog" aria-label="Data source">
          <div className="connpanel-head">
            <h3>Data source</h3>
            <button type="button" className="btn btn-icon btn-ghost" onClick={() => setOpen(false)} aria-label="Close">
              <Icon name="close" size={14} />
            </button>
          </div>

          <dl className="connpanel-facts">
            <div><dt>State</dt><dd className={`tone-${meta.tone}`}>{meta.label}</dd></div>
            <div><dt>Broker</dt><dd className="mono">{conn.broker}</dd></div>
            <div><dt>Uptime</dt><dd className="tnum">{fmtUptime(now - conn.since)}</dd></div>
          </dl>

          {conn.error && !demo && <p className="connpanel-error">{conn.error}</p>}

          {demo && !conn.pinned && (
            <p className="connpanel-note">
              No broker answered at <span className="mono">{conn.broker}</span>, so the dashboard is
              running on simulated telemetry.
            </p>
          )}

          <label className="switch connpanel-switch">
            <input type="checkbox" checked={demo} onChange={(e) => setDemoMode(e.target.checked)} />
            <span className="track" />
            <span className="connpanel-switch-text">
              <strong>Use simulated data</strong>
              <span>Drive the dashboard without a broker</span>
            </span>
          </label>

          {demo && (
            <div className="connpanel-scenarios">
              <h4>Trigger a scenario</h4>
              <div className="scenario-grid">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`scenario-btn ${scenario === s.id ? 'active' : ''}`}
                    onClick={() => pick(s.id)}
                    title={s.hint}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

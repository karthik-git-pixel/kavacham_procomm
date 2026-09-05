import React from 'react';
import Icon from './Icon';
import { setDemoMode } from '../state/connection';
import './NoticeBar.css';

/**
 * Shown when the broker is reachable but nothing is publishing. Without this,
 * a healthy-looking "Broker live" badge sits above a screen of dashes and the
 * operator has no way to tell a quiet mine from a broken pipeline.
 */
export default function NoticeBar({ conn, onDismiss }) {
  if (conn.mode !== 'live' || !conn.silent) return null;

  return (
    <div className="notice" role="status">
      <span className="notice-icon">
        <Icon name="wifiOff" size={15} />
      </span>

      <p className="notice-text">
        <strong>Connected, but no node is publishing.</strong>
        <span>
          The broker at <code>{conn.broker}</code> is reachable and the dashboard is subscribed to{' '}
          <code>kavacham/sensor/+</code> — no helmet has sent telemetry yet.
        </span>
      </p>

      <div className="notice-actions">
        <button type="button" className="btn btn-primary" onClick={() => setDemoMode(true)}>
          <Icon name="play" size={13} /> Use demo data
        </button>
        <button type="button" className="btn btn-icon btn-ghost" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}

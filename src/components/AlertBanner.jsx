import React from 'react';
import Icon from './Icon';
import { nodeSeverity, toneFor } from '../state/severity';
import './AlertBanner.css';

const TITLE = ['Safe', 'Caution', 'Warning', 'Emergency'];

/**
 * Site-wide hazard bar. Appears only at warning level or above so it never
 * becomes wallpaper the operator learns to ignore, and always answers three
 * questions at once: how bad, who, and what to do next.
 */
export default function AlertBanner({ nodes, site, onSelect, onAcknowledge, muted, onToggleMute }) {
  const affected = Object.values(nodes || {})
    .map((node) => ({ node, sev: nodeSeverity(node) }))
    .filter((x) => x.sev.level >= 2)
    .sort((a, b) => b.sev.level - a.sev.level);

  if (site.level < 2 || affected.length === 0) return null;

  const evac = site.evacuate;
  const tone = evac ? 'danger' : toneFor(site.level);

  const headline = evac
    ? 'Zone evacuation'
    : `${TITLE[site.level]} — ${affected.length} worker${affected.length > 1 ? 's' : ''} affected`;

  const detail = evac
    ? 'Multiple shafts are critical. Evacuate all workers now.'
    : affected
        .slice(0, 2)
        .map((x) => `${x.node.label}: ${x.sev.reasons[0]?.text || 'hazard detected'}`)
        .join(' · ');

  return (
    <div
      className={`abanner tone-${tone} ${evac ? 'is-evac' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="abanner-icon">
        <Icon name={evac || site.level >= 3 ? 'siren' : 'alert'} size={evac ? 22 : 18} />
      </span>

      <div className="abanner-text">
        <strong className="abanner-title">{headline}</strong>
        <span className="abanner-detail">{detail}</span>
      </div>

      <div className="abanner-actions">
        {affected.slice(0, 3).map((x) => (
          <button
            key={x.node.id}
            type="button"
            className="btn abanner-locate"
            onClick={() => onSelect(x.node.id)}
          >
            <Icon name="pin" size={13} /> {x.node.label}
          </button>
        ))}

        <button
          type="button"
          className="btn btn-icon abanner-mute"
          onClick={onToggleMute}
          aria-pressed={muted}
          title={muted ? 'Unmute alarm' : 'Mute alarm'}
          aria-label={muted ? 'Unmute alarm' : 'Mute alarm'}
        >
          <Icon name={muted ? 'volumeOff' : 'volume'} size={15} />
        </button>

        <button type="button" className="btn abanner-ack" onClick={onAcknowledge}>
          <Icon name="check" size={14} /> Acknowledge
        </button>
      </div>
    </div>
  );
}

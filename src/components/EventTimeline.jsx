import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { toneFor, relTime } from '../state/severity';
import { clearEvents } from '../state/nodeStore';
import './EventTimeline.css';

const clock = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour12: false });

export default function EventTimeline({ events, nodes, selectedId, onSelect, now }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const scrollRef = useRef(null);
  const lastTopId = useRef(null);

  const rows = useMemo(() => {
    return events.filter((e) => {
      if (alertsOnly && e.level === 0) return false;
      if (selectedId && e.node !== selectedId) return false;
      return true;
    });
  }, [events, alertsOnly, selectedId]);

  // Newest events land at the top, so "auto-scroll" means keeping the top in
  // view rather than chasing the bottom of the list.
  useEffect(() => {
    const top = rows[0]?.id ?? null;
    if (autoScroll && top !== lastTopId.current && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    lastTopId.current = top;
  }, [rows, autoScroll]);

  const nameOf = (id) => {
    if (!id) return 'System';
    return nodes?.[id]?.label || id;
  };

  const selectedLabel = selectedId ? nameOf(selectedId) : null;

  return (
    <section className="etl card" aria-label="Event timeline">
      <header className="card-head etl-head">
        <div className="etl-title-wrap">
          <h2 className="card-title">
            Event Timeline
            <span className="chip chip-quiet tnum">{rows.length}</span>
          </h2>
          {selectedLabel && (
            <button type="button" className="chip chip-info etl-focus" onClick={() => onSelect(null)}>
              Filtered to {selectedLabel}
              <Icon name="close" size={11} />
            </button>
          )}
        </div>

        <div className="etl-controls">
          <button
            type="button"
            className={`btn btn-ghost etl-toggle ${alertsOnly ? 'on' : ''}`}
            aria-pressed={alertsOnly}
            onClick={() => setAlertsOnly((v) => !v)}
          >
            <Icon name="filter" size={13} /> Alerts only
          </button>

          <label className="switch etl-switch">
            <span className="etl-switch-label">Auto-scroll</span>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span className="track" />
          </label>

          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={clearEvents}
            title="Clear the event log"
            aria-label="Clear the event log"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </header>

      <div className="etl-scroll scroll-y" ref={scrollRef}>
        {rows.length === 0 ? (
          <div className="empty">
            <Icon name="clock" size={22} />
            <strong>No events yet</strong>
            <span>
              {alertsOnly || selectedId
                ? 'Nothing matches the current filter.'
                : 'Threshold crossings, falls and SOS calls appear here as they happen.'}
            </span>
          </div>
        ) : (
          <table className="etl-table">
            <thead>
              <tr>
                <th scope="col" className="c-time">Time</th>
                <th scope="col" className="c-worker">Worker</th>
                <th scope="col" className="c-event">Event</th>
                <th scope="col" className="c-value">Value</th>
                <th scope="col" className="c-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const tone = toneFor(e.level);
                return (
                  <tr key={e.id} className={`lvl-${e.level}`}>
                    <td className="c-time tnum">
                      <span className="etl-clock">{clock(e.time)}</span>
                      <span className="etl-rel">{relTime(e.time, now)}</span>
                    </td>
                    <td className="c-worker">
                      {e.node ? (
                        <button type="button" className="etl-worker-btn" onClick={() => onSelect(e.node)}>
                          {nameOf(e.node)}
                        </button>
                      ) : (
                        <span className="etl-system">System</span>
                      )}
                    </td>
                    <td className="c-event">{e.desc}</td>
                    <td className="c-value tnum">{e.value || '—'}</td>
                    <td className="c-status">
                      <span className={`chip chip-${tone === 'safe' ? 'quiet' : tone}`}>
                        <span className="dot" style={{ color: `var(--${tone}-solid, var(--${tone}))` }} />
                        {e.kind}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

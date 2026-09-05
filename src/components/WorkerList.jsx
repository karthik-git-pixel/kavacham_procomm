import React, { useMemo, useState } from 'react';
import WorkerCard from './WorkerCard';
import Icon from './Icon';
import { nodeSeverity } from '../state/severity';
import './WorkerList.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Alerts' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'Offline' },
];

export default function WorkerList({ nodes, selectedId, onSelect, now }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const all = useMemo(() => Object.values(nodes || {}), [nodes]);

  const counts = useMemo(() => {
    let online = 0;
    let alert = 0;
    all.forEach((n) => {
      const sev = nodeSeverity(n);
      if (n.link !== 'offline') online += 1;
      if (sev.level > 0) alert += 1;
    });
    return { total: all.length, online, offline: all.length - online, alert };
  }, [all]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    return all
      .filter((n) => {
        const sev = nodeSeverity(n);
        if (filter === 'alert' && sev.level === 0) return false;
        if (filter === 'online' && n.link === 'offline') return false;
        if (filter === 'offline' && n.link !== 'offline') return false;
        if (!q) return true;
        return (
          n.label.toLowerCase().includes(q) ||
          n.zone.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q)
        );
      })
      // Worst first: an operator should never scroll to find the emergency.
      .sort((a, b) => {
        const sa = nodeSeverity(a);
        const sb = nodeSeverity(b);
        if (sb.level !== sa.level) return sb.level - sa.level;
        if (sa.offline !== sb.offline) return sa.offline ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [all, query, filter]);

  return (
    <section className="wlist" aria-label="Workers">
      <header className="wlist-head">
        <h2 className="wlist-title">
          Workers
          <span className="wlist-count tnum">{counts.total}</span>
        </h2>
        <div className="wlist-live">
          <span className="dot dot-live" style={{ color: 'var(--safe-solid)' }} />
          <span>{counts.online} live</span>
          {counts.alert > 0 && (
            <span className="chip chip-warning wlist-alerts">
              <Icon name="alert" size={11} />
              {counts.alert}
            </span>
          )}
        </div>
      </header>

      <div className="wlist-tools">
        <div className="wlist-search">
          <Icon name="search" size={14} className="wlist-search-icon" />
          <input
            id="worker-search"
            className="input"
            type="search"
            value={query}
            placeholder="Search name or zone…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search workers by name or zone"
          />
        </div>
      </div>

      <div className="segmented wlist-filters" role="group" aria-label="Filter workers">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="filter-count tnum">
              {f.id === 'all' ? counts.total : counts[f.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="wlist-scroll">
        {visible.length === 0 ? (
          <div className="empty">
            <Icon name="search" size={22} />
            <strong>No workers match</strong>
            <span>Try clearing the search or filter.</span>
          </div>
        ) : (
          visible.map((node) => (
            <WorkerCard
              key={node.id}
              node={node}
              now={now}
              selected={selectedId === node.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </section>
  );
}

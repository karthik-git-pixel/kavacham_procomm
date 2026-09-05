import React, { useEffect, useRef } from 'react';
import Icon from './Icon';
import { GAS, TEMP, IMPACT } from '../state/constants';
import './HelpOverlay.css';

const SHORTCUTS = [
  { keys: ['?'], desc: 'Open or close this panel' },
  { keys: ['/'], desc: 'Jump to the worker search box' },
  { keys: ['1', '2', '3'], desc: 'Select the matching worker' },
  { keys: ['Esc'], desc: 'Clear the current selection' },
  { keys: ['A'], desc: 'Select the worst-affected worker' },
  { keys: ['M'], desc: 'Mute or unmute the alarm' },
  { keys: ['T'], desc: 'Switch between light and dark' },
  { keys: ['D'], desc: 'Toggle simulated telemetry' },
];

const BANDS = [
  { label: 'Gas', unit: 'ppm', t: GAS, fmt: (v) => v },
  { label: 'Temperature', unit: '°C', t: TEMP, fmt: (v) => v },
  { label: 'Impact', unit: 'g', t: IMPACT, fmt: (v) => v.toFixed(2) },
];

export default function HelpOverlay({ open, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      // Keep tab focus inside the dialog while it is open.
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="help-scrim" onClick={onClose}>
      <div
        className="help card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-head">
          <h2 id="help-title">
            <Icon name="help" size={17} /> Using this dashboard
          </h2>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose} ref={closeRef} aria-label="Close help">
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="help-body">
          <section className="help-section">
            <h3>Keyboard shortcuts</h3>
            <ul className="help-keys">
              {SHORTCUTS.map((s) => (
                <li key={s.desc}>
                  <span className="help-key-group">
                    {s.keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                  <span>{s.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="help-section">
            <h3>Alarm thresholds</h3>
            <table className="help-table">
              <thead>
                <tr>
                  <th scope="col">Reading</th>
                  <th scope="col"><span className="dot" style={{ color: 'var(--caution-solid)' }} /> Caution</th>
                  <th scope="col"><span className="dot" style={{ color: 'var(--warning-solid)' }} /> Warning</th>
                  <th scope="col"><span className="dot" style={{ color: 'var(--danger-solid)' }} /> Emergency</th>
                </tr>
              </thead>
              <tbody>
                {BANDS.map((b) => (
                  <tr key={b.label}>
                    <th scope="row">{b.label}</th>
                    <td className="tnum">{b.fmt(b.t.CAUTION)} {b.unit}</td>
                    <td className="tnum">{b.fmt(b.t.WARNING)} {b.unit}</td>
                    <td className="tnum">{b.fmt(b.t.EMERGENCY)} {b.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="help-note">
              An SOS press or a detected fall raises an emergency on its own, whatever the sensor
              readings say. Two workers in emergency at once triggers a zone evacuation.
            </p>
          </section>

          <section className="help-section">
            <h3>Reading a worker card</h3>
            <ul className="help-list">
              <li><strong>Coloured spine</strong> on the left edge is the worker's worst current state.</li>
              <li><strong>Click a card</strong> to expand full gauges and highlight that worker on the map.</li>
              <li><strong>Tick marks</strong> on each gauge show where caution, warning and emergency begin.</li>
              <li><strong>Dashes</strong> mean the sensor is not fitted on that node, or the node is offline.</li>
              <li>Cards sort worst-first, so an emergency is never below the fold.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TopNav from './components/TopNav';
import AlertBanner from './components/AlertBanner';
import NoticeBar from './components/NoticeBar';
import WorkerList from './components/WorkerList';
import ZoneMap from './components/ZoneMap';
import EventTimeline from './components/EventTimeline';
import SystemSummary from './components/SystemSummary';
import EnvironmentalOverview from './components/EnvironmentalOverview';
import HelpOverlay from './components/HelpOverlay';
import { useNodeStore, useEventStore } from './state/nodeStore';
import { useConnection, connect, disconnect, setDemoMode } from './state/connection';
import { nodeSeverity, siteSeverity } from './state/severity';
import { updateAudioAlarm, primeAudio, stopAlarm } from './state/audio';
import './App.css';

const readStored = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const store = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private browsing — preferences just will not persist. */
  }
};

export default function App() {
  const nodes = useNodeStore();
  const events = useEventStore();
  const conn = useConnection();

  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [muted, setMuted] = useState(() => readStored('kavacham.muted', 'false') === 'true');
  const [theme, setTheme] = useState(() => readStored('kavacham.theme', 'system'));
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  );
  const [ackSignature, setAckSignature] = useState(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  /* --- Connection ------------------------------------------------------- */
  useEffect(() => {
    connect();
    return () => {
      disconnect();
      stopAlarm();
    };
  }, []);

  /* --- One clock drives every relative timestamp on the page ------------- */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* --- Theme ------------------------------------------------------------- */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    store('kavacham.theme', theme);
  }, [theme]);

  // Track the OS preference so the toggle icon stays correct while on "system".
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  /* --- Severity ---------------------------------------------------------- */
  const site = useMemo(() => siteSeverity(nodes), [nodes]);

  const alertCount = useMemo(
    () => Object.values(nodes).filter((n) => nodeSeverity(n).level > 0).length,
    [nodes]
  );

  // An acknowledgement covers one specific situation. If the level rises or a
  // different worker gets into trouble, the alarm comes back.
  const signature = useMemo(() => {
    const ids = Object.values(nodes)
      .filter((n) => nodeSeverity(n).level >= 2)
      .map((n) => n.id)
      .sort()
      .join(',');
    return `${site.level}|${site.evacuate ? 'evac' : ''}|${ids}`;
  }, [nodes, site]);

  const acknowledged = ackSignature === signature;

  useEffect(() => {
    updateAudioAlarm(acknowledged ? 0 : site.level, muted);
  }, [site.level, muted, acknowledged]);

  useEffect(() => {
    store('kavacham.muted', String(muted));
  }, [muted]);

  /* --- Actions ------------------------------------------------------------ */
  const toggleMute = useCallback(() => {
    primeAudio();
    setMuted((m) => !m);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const current = t === 'system' ? (systemDark ? 'dark' : 'light') : t;
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [systemDark]);

  const worstWorkerId = useMemo(() => {
    const ranked = Object.values(nodes)
      .map((n) => ({ id: n.id, level: nodeSeverity(n).level }))
      .sort((a, b) => b.level - a.level);
    return ranked[0]?.level > 0 ? ranked[0].id : null;
  }, [nodes]);

  const jumpToAlert = useCallback(() => {
    if (worstWorkerId) setSelectedId(worstWorkerId);
  }, [worstWorkerId]);

  /* --- Keyboard shortcuts -------------------------------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        setSelectedId(null);
        setHelpOpen(false);
        if (typing) el.blur();
        return;
      }

      if (typing) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
        case '/':
          e.preventDefault();
          document.getElementById('worker-search')?.focus();
          break;
        case '1':
        case '2':
        case '3': {
          const id = `WSN-${e.key}`;
          if (nodes[id]) setSelectedId((s) => (s === id ? null : id));
          break;
        }
        case 'a':
        case 'A':
          jumpToAlert();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 't':
        case 'T':
          toggleTheme();
          break;
        case 'd':
        case 'D':
          setDemoMode(conn.mode !== 'demo');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nodes, conn.mode, jumpToAlert, toggleMute, toggleTheme]);

  return (
    <div className="app" onPointerDownCapture={primeAudio}>
      <TopNav
        conn={conn}
        now={now}
        alertCount={alertCount}
        muted={muted}
        onToggleMute={toggleMute}
        theme={resolvedTheme}
        onToggleTheme={toggleTheme}
        onOpenHelp={() => setHelpOpen(true)}
        onJumpToAlert={jumpToAlert}
      />

      {!noticeDismissed && <NoticeBar conn={conn} onDismiss={() => setNoticeDismissed(true)} />}

      {!acknowledged && (
        <AlertBanner
          nodes={nodes}
          site={site}
          onSelect={setSelectedId}
          onAcknowledge={() => setAckSignature(signature)}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      <main className="app-body">
        <div className="col col-workers">
          <WorkerList
            nodes={nodes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            now={now}
          />
        </div>

        <div className="col col-main">
          <ZoneMap nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} now={now} />
          <EventTimeline
            events={events}
            nodes={nodes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            now={now}
          />
        </div>

        <div className="col col-rail scroll-y">
          <SystemSummary nodes={nodes} />
          <EnvironmentalOverview nodes={nodes} />
        </div>
      </main>

      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

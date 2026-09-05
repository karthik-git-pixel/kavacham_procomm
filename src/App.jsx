import React, { useEffect, useState } from 'react';
import { connectMQTT, disconnectMQTT } from './state/mqttClient';
import { useNodeStore, useEventStore } from './state/nodeStore';
import WorkerCard from './components/WorkerCard';
import ZoneMap from './components/ZoneMap';
import EventTimeline from './components/EventTimeline';
import ConnectionStrip from './components/ConnectionStrip';
import SeverityBanner from './components/SeverityBanner';
import './App.css'; // Might need to clear default styles if they conflict, but I'll use inline or just a simple dashboard class

function App() {
  const [mqttStatus, setMqttStatus] = useState('connecting');
  const nodes = useNodeStore();
  const events = useEventStore();

  useEffect(() => {
    connectMQTT({
      onStatusChange: (status) => setMqttStatus(status)
    });

    return () => {
      disconnectMQTT();
    };
  }, []);

  // Compute highest severity across all nodes
  const nodesArray = Object.values(nodes);
  const maxAlert = Math.max(0, ...nodesArray.map(n => n.alert || 0));
  
  // Extract all events/history for timeline if needed, or maybe EventTimeline gets data differently.
  // Assuming EventTimeline and ZoneMap can just take nodes or don't need props if they use nodeStore internally.
  // Actually, ZoneMap takes nodes as prop or uses nodeStore itself? Let's check ZoneMap.jsx
  // I will pass nodes to it just in case, or it might just call useNodes().

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg)', color: 'var(--text)', overflow: 'hidden' }}>
      
      <ConnectionStrip status={mqttStatus} />
      {maxAlert > 0 && <SeverityBanner level={maxAlert} />}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '16px', gap: '16px' }}>
        
        {/* Left Column: Worker Cards */}
        <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <WorkerCard node={nodes['WSN-1']} />
          <WorkerCard node={nodes['WSN-2']} />
          <WorkerCard node={nodes['WSN-3']} />
        </div>

        {/* Center/Right Column: Map and Timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <div style={{ flex: 2, minHeight: 0, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <ZoneMap />
          </div>
          <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <EventTimeline events={events} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
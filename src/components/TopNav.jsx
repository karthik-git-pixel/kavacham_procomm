import React from 'react';
import './TopNav.css';
import helmetLogo from '../assets/wowhelmet.png';

export default function TopNav({ status, uptime = "00:00:00" }) {
  const isOnline = status === 'live';
  
  return (
    <div className="topnav">
      <div className="topnav-left">
        <img src={helmetLogo} alt="Logo" className="topnav-logo" />
        <div className="topnav-brand">
          <div className="brand-title">KAVACHAM</div>
          <div className="brand-subtitle">Real-time Underground Monitoring</div>
        </div>
      </div>
      
      <div className="topnav-center">
        <button className="nav-btn active">
          Live Monitor
        </button>
        <button className="nav-btn">
          Analytics
        </button>
        <button className="nav-btn">
          Workers
        </button>
        <button className="nav-btn">
          Settings
        </button>
      </div>
      
      <div className="topnav-right">
        <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span> 
          {isOnline ? 'System Online' : 'Connecting...'}
        </div>
        
        <div className="time-info">
          <div className="current-date">{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString()}</div>
          <div className="uptime">Uptime: {uptime}</div>
        </div>
        
        <button className="notification-btn">
          <span className="bell-icon">🔔</span>
        </button>
      </div>
    </div>
  );
}

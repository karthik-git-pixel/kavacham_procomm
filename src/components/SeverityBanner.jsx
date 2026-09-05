import React from 'react';
import './SeverityBanner.css';

export default function SeverityBanner({ siteLevel }) {
  const isEvac = siteLevel === 4;
  
  let text = '';
  let subtext = '';
  let bannerClass = 'severity-banner ';
  
  if (isEvac) {
    text = 'ZONE EVACUATION';
    subtext = 'Multiple hazards across two zones. Evacuate all workers now.';
    bannerClass += 'evac';
  } else if (siteLevel === 3) {
    text = 'EMERGENCY';
    subtext = 'Hazard detected. Action required immediately.';
    bannerClass += 'level-3';
  } else if (siteLevel === 2) {
    text = 'WARNING';
    subtext = 'Parameter above safe limit. Prepare to intervene.';
    bannerClass += 'level-2';
  } else if (siteLevel === 1) {
    text = 'CAUTION';
    subtext = 'Elevated reading. Monitoring.';
    bannerClass += 'level-1';
  } else {
    text = 'SAFE';
    subtext = 'All workers reporting. No hazards detected.';
    bannerClass += 'level-0';
  }

  return (
    <div className={bannerClass}>
      <div className="banner-content">
        <span className="banner-title">{text}</span>
        <span className="banner-divider"></span>
        <span className="banner-subtext">{subtext}</span>
      </div>
    </div>
  );
}

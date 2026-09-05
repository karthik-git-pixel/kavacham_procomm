let audioCtx = null;
let osc = null;
let activeInterval = null;

const startBeep = (freq) => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (osc) return;
  osc = audioCtx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
};

const stopBeep = () => {
  if (osc) {
    osc.stop();
    osc.disconnect();
    osc = null;
  }
};

export const updateAudioAlarm = (level, muted) => {
  if (muted || level === 0) {
    clearInterval(activeInterval);
    activeInterval = null;
    stopBeep();
    return;
  }

  // To prevent multiple intervals
  if (activeInterval) return;

  if (level === 1) { // CAUTION: double beep 660Hz
    activeInterval = setInterval(() => {
      startBeep(660);
      setTimeout(stopBeep, 200);
      setTimeout(() => { startBeep(660); }, 300);
      setTimeout(stopBeep, 500);
    }, 2000);
  } else if (level === 2) { // WARNING: triple beep 880Hz
    activeInterval = setInterval(() => {
      startBeep(880);
      setTimeout(stopBeep, 150);
      setTimeout(() => { startBeep(880); }, 250);
      setTimeout(stopBeep, 400);
      setTimeout(() => { startBeep(880); }, 500);
      setTimeout(stopBeep, 650);
    }, 1500);
  } else if (level >= 3) { // EMERGENCY / EVAC: continuous warble 1kHz
    let high = true;
    activeInterval = setInterval(() => {
      stopBeep();
      startBeep(high ? 1000 : 800);
      high = !high;
    }, 200);
  }
};

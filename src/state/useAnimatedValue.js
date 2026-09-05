import { useState, useEffect, useRef } from 'react';

export function useAnimatedValue(target, stiffness = 0.14) {
  const [display, setDisplay] = useState(target);
  const current = useRef(target);
  
  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      current.current = target;
      setDisplay(target);
      return;
    }

    let raf;
    const step = () => {
      const diff = target - current.current;
      if (Math.abs(diff) < 0.25) {
        current.current = target;
        setDisplay(target);
        return;
      }
      current.current += diff * stiffness;
      setDisplay(current.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, stiffness]);
  
  return display;
}

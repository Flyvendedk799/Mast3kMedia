import { useEffect, useRef } from 'react';

/**
 * Subtle radial glow that follows the cursor.
 * Pure CSS variable updates — no React re-renders.
 */
const MouseSpotlight = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const handle = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const loop = () => {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      el.style.setProperty('--sx', `${cx}px`);
      el.style.setProperty('--sy', `${cy}px`);
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };

    window.addEventListener('mousemove', handle);
    return () => {
      window.removeEventListener('mousemove', handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{
        background:
          'radial-gradient(600px circle at var(--sx, 50%) var(--sy, 50%), hsl(239 84% 67% / 0.08), transparent 60%)',
        mixBlendMode: 'screen',
      }}
    />
  );
};

export default MouseSpotlight;

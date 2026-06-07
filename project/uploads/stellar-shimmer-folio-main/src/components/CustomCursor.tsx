import { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const rendered = useRef({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if ('ontouchstart' in window) return;

    const handleMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      const target = e.target as HTMLElement;
      setHovering(!!target.closest('a, button, [role="button"], .cursor-pointer, input, textarea, select'));
    };

    window.addEventListener('mousemove', handleMove);

    let raf: number;
    const animate = () => {
      rendered.current.x += (pos.current.x - rendered.current.x) * 0.15;
      rendered.current.y += (pos.current.y - rendered.current.y) * 0.15;
      if (dotRef.current) {
        const size = hovering ? 20 : 12;
        const offset = size / 2;
        dotRef.current.style.transform = `translate(${rendered.current.x - offset}px, ${rendered.current.y - offset}px)`;
        dotRef.current.style.width = `${size}px`;
        dotRef.current.style.height = `${size}px`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(raf);
    };
  }, [hovering]);

  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

  return (
    <div
      ref={dotRef}
      className="fixed top-0 left-0 rounded-full pointer-events-none will-change-transform"
      style={{
        zIndex: 9999,
        width: 12,
        height: 12,
        background: '#6366F1',
        transition: 'width 0.2s ease, height 0.2s ease',
        boxShadow: '0 0 12px rgba(99,102,241,0.5)',
        mixBlendMode: 'screen',
      }}
    />
  );
};

export default CustomCursor;

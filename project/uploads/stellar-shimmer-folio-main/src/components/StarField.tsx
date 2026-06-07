import { useEffect, useRef, useMemo } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  twinkleOffset: number;
}

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 50 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 0.3 + 0.1,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener('mousemove', onMouse);

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      stars.forEach((star) => {
        const twinkle = Math.sin(time * 0.001 * star.speed + star.twinkleOffset) * 0.5 + 0.5;
        const parallaxX = mx * star.speed * 12;
        const parallaxY = my * star.speed * 12;
        const x = star.x * canvas.width + parallaxX;
        const y = star.y * canvas.height + parallaxY;
        const alpha = star.opacity * (0.4 + twinkle * 0.6);
        const size = star.size * (0.8 + twinkle * 0.4);

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        // Use indigo tones
        ctx.fillStyle = `hsla(239, 60%, 75%, ${alpha})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [stars]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.15 }}
    />
  );
};

export default StarField;

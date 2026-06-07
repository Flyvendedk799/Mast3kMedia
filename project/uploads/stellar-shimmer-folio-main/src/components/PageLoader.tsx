import { useState, useEffect } from 'react';

const loadingQuips = [
  'Brewing pixels...',
  'Compiling creativity...',
  'Warming up the GPU...',
  'Polishing the UI...',
  'Loading awesomeness...',
];

const PageLoader = () => {
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [quip] = useState(() => loadingQuips[Math.floor(Math.random() * loadingQuips.length)]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 30 + 10, 100));
    }, 150);

    const t1 = setTimeout(() => { setLoaded(true); clearInterval(interval); }, 800);
    const t2 = setTimeout(() => setHidden(true), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(interval); };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] bg-background flex flex-col items-center justify-center transition-all duration-500 ${
        loaded ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Animated monogram */}
      <div className="relative mb-6">
        <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent"
          style={{ fontFamily: "'Space Grotesk', sans-serif", animation: 'pulse 1.5s ease-in-out infinite' }}>
          M3
        </div>
        {/* Orbiting dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" 
            style={{ animation: 'orbit 2s linear infinite', '--orbit-radius': '32px' } as React.CSSProperties} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-32 h-0.5 rounded-full bg-white/10 overflow-hidden mb-3">
        <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-200"
          style={{ width: `${progress}%` }} />
      </div>

      {/* Quip */}
      <p className="text-xs text-white/30 font-mono tracking-wider">{quip}</p>
    </div>
  );
};

export default PageLoader;

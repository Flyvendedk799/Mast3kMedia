import { useRef, useState, useCallback, useEffect } from 'react';
import { MoveHorizontal } from 'lucide-react';

export interface BeforeAfterItem {
  before: string;
  after: string;
  caption?: string;
}

interface BeforeAfterProps {
  items: BeforeAfterItem[];
}

const Slider = ({ item }: { item: BeforeAfterItem }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, next)));
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4));
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4));
    if (e.key === 'Home') setPos(0);
    if (e.key === 'End') setPos(100);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updateFromClientX(x);
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [updateFromClientX]);

  return (
    <figure className="glass rounded-xl gradient-border overflow-hidden">
      <div
        ref={containerRef}
        role="slider"
        aria-label="Before / after comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative w-full aspect-[16/10] select-none touch-none cursor-ew-resize bg-muted/20 outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        onMouseDown={(e) => { dragging.current = true; updateFromClientX(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; updateFromClientX(e.touches[0].clientX); }}
      >
        <img src={item.after} alt="After" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
        <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={item.before} alt="Before" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        </div>
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider bg-black/50 text-white backdrop-blur-sm pointer-events-none">Before</div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider bg-primary/80 text-primary-foreground backdrop-blur-sm pointer-events-none">After</div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none shadow-lg" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
            <MoveHorizontal size={18} />
          </div>
        </div>
      </div>
      {item.caption && (
        <figcaption className="px-4 py-3 text-xs text-muted-foreground border-t border-border/40">{item.caption}</figcaption>
      )}
    </figure>
  );
};

const BeforeAfter = ({ items }: BeforeAfterProps) => {
  if (!items?.length) return null;
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Before <span className="gradient-text">/ After</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">Drag the slider to compare states.</p>
        <div className="grid grid-cols-1 gap-8">
          {items.map((it, i) => (<Slider key={i} item={it} />))}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfter;

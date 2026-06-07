import { useState } from 'react';
import { Monitor, Tablet, Smartphone, RotateCw, ExternalLink } from 'lucide-react';

interface PreviewSandboxProps {
  url: string;
}

type Device = 'desktop' | 'tablet' | 'mobile';

const widths: Record<Device, number> = { desktop: 1280, tablet: 768, mobile: 390 };
const heights: Record<Device, number> = { desktop: 800, tablet: 1024, mobile: 780 };

const PreviewSandbox = ({ url }: PreviewSandboxProps) => {
  const [device, setDevice] = useState<Device>('desktop');
  const [reloadKey, setReloadKey] = useState(0);
  const w = widths[device];
  const h = heights[device];

  return (
    <div className="glass rounded-xl gradient-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/10 flex-wrap">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <span className="text-xs text-muted-foreground font-mono flex-1 truncate ml-2 min-w-0">{url}</span>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/30">
          {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => {
            const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone;
            const active = device === d;
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`px-2.5 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={d}
                title={d}
              >
                <Icon size={13} />
                <span className="hidden sm:inline capitalize">{d}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="p-2 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Reload preview"
          title="Reload"
        >
          <RotateCw size={13} />
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
          <ExternalLink size={12} /> Open
        </a>
      </div>
      <div className="w-full overflow-auto bg-muted/5 flex justify-center p-4 md:p-6">
        <div
          className="bg-background rounded-lg shadow-2xl shadow-primary/10 transition-all duration-500 ease-out border border-border/40 overflow-hidden"
          style={{ width: '100%', maxWidth: `${w}px`, height: `${h}px` }}
        >
          <iframe
            key={reloadKey}
            src={url}
            title="Live preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewSandbox;

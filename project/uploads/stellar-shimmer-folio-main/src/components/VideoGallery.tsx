import { useState, useEffect } from 'react';
import { Play, X, ExternalLink } from 'lucide-react';

interface VideoGalleryProps {
  urls: string[];
}

const isFileVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const getEmbedUrl = (url: string): string | null => {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}?autoplay=1`;
  const lo = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (lo) return `https://www.loom.com/embed/${lo[1]}?autoplay=1`;
  return null;
};

const getThumb = (url: string): string | null => {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
};

const Tile = ({ url, onOpen, idx }: { url: string; onOpen: () => void; idx: number }) => {
  const thumb = getThumb(url);
  const file = isFileVideo(url);

  return (
    <button
      onClick={onOpen}
      className="group relative glass rounded-xl gradient-border overflow-hidden aspect-video hover:scale-[1.02] transition-all duration-500 text-left"
    >
      {thumb ? (
        <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      ) : file ? (
        <video src={url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl shadow-primary/40">
          <Play size={24} className="text-primary-foreground ml-1" fill="currentColor" />
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <span className="text-xs font-mono text-foreground/80 bg-background/60 backdrop-blur-sm px-2 py-1 rounded">
          Clip {idx + 1}
        </span>
      </div>
    </button>
  );
};

const VideoGallery = ({ urls }: VideoGalleryProps) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenIdx(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!urls.length) return null;
  const active = openIdx !== null ? urls[openIdx] : null;
  const embed = active ? getEmbedUrl(active) : null;
  const file = active ? isFileVideo(active) : false;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {urls.map((url, i) => (
          <Tile key={i} url={url} idx={i} onOpen={() => setOpenIdx(i)} />
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8" onClick={() => setOpenIdx(null)}>
          <button onClick={() => setOpenIdx(null)} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" aria-label="Close">
            <X size={28} />
          </button>
          <a href={active} target="_blank" rel="noopener noreferrer" className="absolute top-6 left-6 text-white/70 hover:text-white text-xs flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <ExternalLink size={14} /> Open original
          </a>
          <div className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden shadow-2xl shadow-primary/30" onClick={(e) => e.stopPropagation()}>
            {embed ? (
              <iframe src={embed} title="Video" className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ border: 0 }} />
            ) : file ? (
              <video src={active} controls autoPlay className="w-full h-full bg-black" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">Unsupported video URL</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VideoGallery;

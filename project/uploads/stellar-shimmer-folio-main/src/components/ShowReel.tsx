import { useState } from 'react';
import { Play } from 'lucide-react';

interface ShowReelProps {
  url: string;
  poster?: string;
}

const isFileVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const getEmbedUrl = (url: string): string | null => {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&controls=0&playlist=${yt[1]}&modestbranding=1&rel=0`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}?autoplay=1&muted=1&loop=1&background=1`;
  return null;
};

const ShowReel = ({ url, poster }: ShowReelProps) => {
  const [unmuted, setUnmuted] = useState(false);

  if (isFileVideo(url)) {
    return (
      <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-2xl glass gradient-border overflow-hidden group">
        <video
          src={url}
          poster={poster}
          autoPlay
          muted={!unmuted}
          loop
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
        <button
          onClick={() => setUnmuted((u) => !u)}
          className="absolute bottom-4 right-4 glass rounded-full px-4 py-2 text-xs font-mono uppercase tracking-wider text-foreground hover:bg-primary/20 transition-colors flex items-center gap-2"
          aria-label={unmuted ? 'Mute' : 'Unmute'}
        >
          <Play size={12} /> {unmuted ? 'Sound on' : 'Sound off'}
        </button>
      </div>
    );
  }

  const embed = getEmbedUrl(url);
  if (embed) {
    return (
      <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-2xl glass gradient-border overflow-hidden">
        <iframe
          src={embed}
          title="Showreel"
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ border: 0 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return null;
};

export default ShowReel;

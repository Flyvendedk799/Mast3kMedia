import { useState } from 'react';
import { Clock, Link as LinkIcon, Check, Linkedin, Twitter } from 'lucide-react';

interface Props {
  title: string;
  readingMinutes?: number;
}

const ShareBar = ({ title, readingMinutes }: Props) => {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
      {readingMinutes !== undefined && (
        <span className="inline-flex items-center gap-1.5">
          <Clock size={12} /> {readingMinutes} min read
        </span>
      )}
      <span className="hidden sm:inline text-muted-foreground/40">·</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={copy}
          aria-label="Copy link"
          className="glass w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          {copied ? <Check size={13} className="text-primary" /> : <LinkIcon size={13} />}
        </button>
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className="glass w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <Linkedin size={13} />
        </a>
        <a
          href={twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Twitter"
          className="glass w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <Twitter size={13} />
        </a>
      </div>
    </div>
  );
};

export default ShareBar;

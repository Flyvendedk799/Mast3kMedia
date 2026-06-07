import { CSSProperties, ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';

interface ShimmerHeadingProps {
  text: string;
  accent?: string;
  className?: string;
  style?: CSSProperties;
  as?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center';
  children?: ReactNode;
}

/**
 * Per-letter staggered reveal heading with a gradient accent word.
 * Use text="About" accent="Me" to render "About Me" with "Me" gradient.
 */
const ShimmerHeading = ({
  text,
  accent,
  className = '',
  style,
  as: Tag = 'h2',
  align = 'center',
}: ShimmerHeadingProps) => {
  const { ref, visible } = useReveal<HTMLHeadingElement>({ threshold: 0.35 });
  const baseLetters = Array.from(text);
  const accentLetters = accent ? Array.from(accent) : [];

  const renderLetters = (letters: string[], offset: number, gradient: boolean) =>
    letters.map((ch, i) => (
      <span
        key={`${gradient ? 'g' : 'b'}-${i}`}
        aria-hidden
        className="inline-block"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translate3d(0,0,0)' : 'translate3d(0, 0.6em, 0)',
          filter: visible ? 'blur(0)' : 'blur(8px)',
          transition: `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${(offset + i) * 30}ms,
            transform 800ms cubic-bezier(0.22, 1, 0.36, 1) ${(offset + i) * 30}ms,
            filter 700ms cubic-bezier(0.22, 1, 0.36, 1) ${(offset + i) * 30}ms`,
          willChange: 'transform, opacity, filter',
          ...(gradient
            ? {
                background: 'linear-gradient(120deg, hsl(239 84% 72%) 0%, hsl(38 92%, 60%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }
            : {}),
        }}
      >
        {ch === ' ' ? '\u00A0' : ch}
      </span>
    ));

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ textAlign: align, ...style }}
      aria-label={accent ? `${text} ${accent}` : text}
    >
      {renderLetters(baseLetters, 0, false)}
      {accent && <span aria-hidden>{'\u00A0'}</span>}
      {accent && renderLetters(accentLetters, baseLetters.length + 1, true)}
    </Tag>
  );
};

export default ShimmerHeading;

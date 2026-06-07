import { CSSProperties, ElementType, ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';

type Variant = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade' | 'blur';

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  variant?: Variant;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  style?: CSSProperties;
  once?: boolean;
}

const initialTransform = (variant: Variant, d: number) => {
  switch (variant) {
    case 'up': return `translate3d(0, ${d}px, 0)`;
    case 'down': return `translate3d(0, -${d}px, 0)`;
    case 'left': return `translate3d(${d}px, 0, 0)`;
    case 'right': return `translate3d(-${d}px, 0, 0)`;
    case 'scale': return 'scale(0.94)';
    case 'blur': return 'translate3d(0, 12px, 0)';
    case 'fade':
    default: return 'translate3d(0, 0, 0)';
  }
};

const Reveal = ({
  children,
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  duration = 700,
  distance = 28,
  className,
  style,
}: RevealProps) => {
  const { ref, visible } = useReveal<HTMLElement>();

  const blurred = variant === 'blur';
  const mergedStyle: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate3d(0,0,0) scale(1)' : initialTransform(variant, distance),
    filter: blurred && !visible ? 'blur(8px)' : 'blur(0)',
    transition:
      `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms,` +
      ` transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms,` +
      ` filter ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: 'transform, opacity, filter',
    ...style,
  };

  return (
    <Tag ref={ref as any} className={className} style={mergedStyle}>
      {children}
    </Tag>
  );
};

export default Reveal;

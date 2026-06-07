import { useReveal } from '@/hooks/useReveal';

const SectionDivider = () => {
  const { ref, visible } = useReveal<HTMLDivElement>({ threshold: 0.4 });
  return (
    <div className="relative py-2 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto relative">
        <div
          className="section-divider"
          style={{
            transformOrigin: 'center',
            transform: visible ? 'scaleX(1)' : 'scaleX(0)',
            opacity: visible ? 1 : 0,
            transition: 'transform 1100ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms ease',
          }}
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: 'hsl(239 84% 67%)',
            boxShadow: '0 0 12px hsl(239 84% 67% / 0.7), 0 0 24px hsl(239 84% 67% / 0.4)',
            opacity: visible ? 0.9 : 0,
            transform: `translate(-50%, -50%) scale(${visible ? 1 : 0})`,
            transition: 'opacity 600ms ease 300ms, transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 300ms',
          }}
        />
      </div>
    </div>
  );
};

export default SectionDivider;

import { usePortal } from '@/contexts/PortalContext';

const portalGradients: Record<string, string> = {
  'from-purple-600/20 to-cyan-600/20': 'linear-gradient(135deg, hsl(270 80% 45%), hsl(185 80% 45%))',
  'from-rose-600/20 to-orange-600/20': 'linear-gradient(135deg, hsl(350 80% 45%), hsl(25 90% 50%))',
  'from-emerald-600/20 to-teal-600/20': 'linear-gradient(135deg, hsl(155 70% 40%), hsl(170 70% 40%))',
  'from-blue-600/20 to-indigo-600/20': 'linear-gradient(135deg, hsl(220 80% 50%), hsl(240 70% 50%))',
  'from-amber-600/20 to-yellow-600/20': 'linear-gradient(135deg, hsl(40 90% 45%), hsl(50 90% 50%))',
  'from-pink-600/20 to-fuchsia-600/20': 'linear-gradient(135deg, hsl(330 80% 50%), hsl(290 80% 50%))',
};

export const resolveGradient = (gradientKey: string) =>
  portalGradients[gradientKey] || 'linear-gradient(135deg, hsl(270 80% 45%), hsl(185 80% 45%))';

const ProjectPortal = () => {
  const { portalState } = usePortal();

  if (!portalState.active || !portalState.rect) return null;

  const { x, y } = portalState.rect;
  const bg = resolveGradient(portalState.gradient);

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={
        {
          background: bg,
          '--portal-x': `${x}px`,
          '--portal-y': `${y}px`,
          clipPath: `circle(0px at ${x}px ${y}px)`,
          animation: 'portal-expand 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        } as React.CSSProperties
      }
    />
  );
};

export default ProjectPortal;

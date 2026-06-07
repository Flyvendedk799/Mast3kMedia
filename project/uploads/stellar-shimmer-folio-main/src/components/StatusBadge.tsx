import { normalizeStatus, statusBadgeClasses, statusLabels, type ProjectStatus } from '@/lib/projectStatus';

interface Props {
  status: string | null | undefined;
  size?: 'sm' | 'xs';
  className?: string;
  withDot?: boolean;
}

const StatusBadge = ({ status, size = 'sm', className = '', withDot = true }: Props) => {
  const s: ProjectStatus = normalizeStatus(status);
  const sizeCls = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-mono uppercase tracking-wider ${statusBadgeClasses[s]} ${sizeCls} ${className}`}
    >
      {withDot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            s === 'live' ? 'bg-emerald-400' :
            s === 'in-progress' ? 'bg-accent animate-pulse' :
            s === 'concept' ? 'bg-primary' :
            'bg-foreground/40'
          }`}
        />
      )}
      {statusLabels[s]}
    </span>
  );
};

export default StatusBadge;

export type ProjectStatus = 'live' | 'in-progress' | 'concept' | 'archived';

export const PROJECT_STATUSES: ProjectStatus[] = ['live', 'in-progress', 'concept', 'archived'];

export const statusLabels: Record<ProjectStatus, string> = {
  'live': 'Live',
  'in-progress': 'In Progress',
  'concept': 'Concept',
  'archived': 'Archived',
};

export const statusEmoji: Record<ProjectStatus, string> = {
  'live': '🟢',
  'in-progress': '🟡',
  'concept': '🔵',
  'archived': '⚪',
};

// Tailwind class strings using semantic tokens; pulse for in-progress.
export const statusBadgeClasses: Record<ProjectStatus, string> = {
  'live': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'in-progress': 'bg-accent/15 text-accent border-accent/30',
  'concept': 'bg-primary/15 text-primary border-primary/30',
  'archived': 'bg-white/[0.04] text-foreground/50 border-white/10',
};

export const normalizeStatus = (s: string | null | undefined): ProjectStatus =>
  (PROJECT_STATUSES.includes(s as ProjectStatus) ? (s as ProjectStatus) : 'live');

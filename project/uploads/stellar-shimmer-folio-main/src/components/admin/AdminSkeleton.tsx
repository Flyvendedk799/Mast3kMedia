import { Skeleton } from '@/components/ui/skeleton';

export const CardSkeleton = () => (
  <div className="glass rounded-xl gradient-border p-5 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-5 w-40 bg-muted/50" />
      <Skeleton className="h-5 w-16 rounded-full bg-muted/50" />
    </div>
    <Skeleton className="h-4 w-full bg-muted/50" />
  </div>
);

export const FormSkeleton = () => (
  <div className="glass rounded-xl gradient-border p-6 space-y-5 max-w-2xl">
    {[1, 2, 3, 4].map((i) => (
      <div key={i}>
        <Skeleton className="h-3 w-20 mb-2 bg-muted/50" />
        <Skeleton className="h-10 w-full bg-muted/50 rounded-lg" />
      </div>
    ))}
  </div>
);

export const StatSkeleton = () => (
  <div className="glass rounded-xl gradient-border p-6">
    <Skeleton className="h-4 w-24 mb-3 bg-muted/50" />
    <Skeleton className="h-8 w-12 bg-muted/50" />
  </div>
);

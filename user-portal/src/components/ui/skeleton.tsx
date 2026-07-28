import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

/** Stacked placeholder cards, for the list views (applications, visas, payments). */
function ListSkeleton({ rows = 4, className, rowClassName }: { rows?: number; className?: string; rowClassName?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-24 w-full rounded-2xl', rowClassName)} />
      ))}
    </div>
  );
}

/** Placeholder tiles for the card grids (countries, visa types, vault documents). */
function CardGridSkeleton({ count = 6, className, cardClassName }: { count?: number; className?: string; cardClassName?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('h-44 w-full rounded-2xl', cardClassName)} />
      ))}
    </div>
  );
}

export { Skeleton, ListSkeleton, CardGridSkeleton };

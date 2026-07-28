import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

/** Placeholder rows for a `<Table>` body while its data loads. */
function TableSkeleton({ rows = 5, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="p-4 align-middle"><Skeleton className="h-4 w-20" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Placeholder tiles matching the card grids used across the dashboard. */
function CardGridSkeleton({ count = 8, className, cardClassName }: { count?: number; className?: string; cardClassName?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('h-52 w-full rounded-2xl', cardClassName)} />
      ))}
    </div>
  );
}

/** Stacked label + field pairs, for forms that render once their data arrives. */
function FormSkeleton({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, TableSkeleton, CardGridSkeleton, FormSkeleton };

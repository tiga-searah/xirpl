'use client';

import { Skeleton } from '@xirpl/shared/components/ui/skeleton';

export function HabitJournalSkeleton() {
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="mt-3 h-5 w-80 max-w-full rounded-lg" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-2xl border border-border/70 p-6 dark:border-border">
            <Skeleton className="h-7 w-40 rounded-lg" />
            <div className="mt-6 space-y-5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="space-y-3 border-t border-border/70 pt-5 first:border-0 first:pt-0 dark:border-border"
                >
                  <Skeleton className="h-5 w-36 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

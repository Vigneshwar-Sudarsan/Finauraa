import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden pb-16 md:pb-0">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Total Balance skeleton */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Bank cards skeleton */}
          <section>
            <Skeleton className="h-4 w-16 mb-3" />
            <div className="flex gap-4 overflow-x-auto py-2">
              <Skeleton className="flex-shrink-0 w-14 h-32 rounded-xl" />
              {[1, 2].map((i) => (
                <Skeleton key={i} className="flex-shrink-0 w-48 h-32 rounded-xl" />
              ))}
            </div>
          </section>

          {/* Account Tabs skeleton */}
          <Separator />
          <section>
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-28 rounded-lg" />
              ))}
            </div>
          </section>

          {/* Recent Transactions skeleton */}
          <Separator />
          <section>
            <Skeleton className="h-4 w-36 mb-3" />
            <div className="rounded-xl border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border-b last:border-b-0">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

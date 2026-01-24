import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConnectedBanksLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden">
      {/* Header skeleton */}
      <div className="p-4 border-b flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded" />
          <Skeleton className="h-9 w-24 rounded" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title skeleton */}
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>

          {/* Bank cards skeleton */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            <Skeleton className="flex-shrink-0 w-14 h-32 rounded-xl" />
            {[1, 2].map((i) => (
              <Skeleton key={i} className="flex-shrink-0 w-48 h-32 rounded-xl" />
            ))}
          </div>

          {/* Accounts list skeleton */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Accounts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b last:border-b-0">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="size-4" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Danger Zone skeleton */}
          <Card className="border-red-500/30">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

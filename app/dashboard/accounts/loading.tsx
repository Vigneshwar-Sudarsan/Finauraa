import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountsLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden pb-16 md:pb-0">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="size-8 rounded-full" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Bank cards skeleton */}
          <div className="flex gap-4 overflow-x-auto py-2">
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
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b last:border-b-0">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16 ml-auto" />
                    </div>
                    <Skeleton className="size-4" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

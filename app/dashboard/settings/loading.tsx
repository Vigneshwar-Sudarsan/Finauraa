import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden pb-16 md:pb-0">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Account Section Skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="p-0">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  {i > 1 && <Separator />}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <Skeleton className="size-4" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Preferences Section Skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="p-0">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  {i > 1 && <Separator />}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded" />
                      <div>
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    {i === 2 ? (
                      <Skeleton className="h-6 w-11 rounded-full" />
                    ) : (
                      <Skeleton className="size-4" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Settings Skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-5 rounded" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
                <Skeleton className="size-4" />
              </div>
            </CardContent>
          </Card>

          {/* Security Skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-5 rounded" />
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="size-4" />
              </div>
            </CardContent>
          </Card>

          {/* Log Out Skeleton */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-5 rounded" />
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <Skeleton className="size-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Force dynamic rendering for all dashboard pages
// This prevents static generation which fails without env vars at build time
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

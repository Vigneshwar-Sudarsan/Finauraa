"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Bank,
  Sparkle,
  Download,
  Trash,
  Eye,
  Clock,
  CheckCircle,
  Warning,
  SpinnerGap,
  X,
  FileText,
  CalendarBlank,
  Info,
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";

interface Consent {
  id: string;
  consent_type: string;
  provider_id: string | null;
  provider_name: string | null;
  permissions_granted: string[];
  purpose: string;
  consent_given_at: string;
  consent_expires_at: string;
  consent_status: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}

interface ExportRequest {
  id: string;
  status: string;
  format: string;
  requested_at: string;
  completed_at: string | null;
  file_size_bytes: number | null;
}

export function PrivacyContent() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [isLoadingConsents, setIsLoadingConsents] = useState(true);
  const [isLoadingExports, setIsLoadingExports] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [consentToRevoke, setConsentToRevoke] = useState<Consent | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [exportData, setExportData] = useState<Record<string, unknown> | null>(null);

  const fetchConsents = useCallback(async () => {
    setIsLoadingConsents(true);
    try {
      const response = await fetch("/api/consents");
      if (response.ok) {
        const data = await response.json();
        setConsents(data.consents || []);
      }
    } catch (error) {
      console.error("Failed to fetch consents:", error);
    } finally {
      setIsLoadingConsents(false);
    }
  }, []);

  const fetchExportRequests = useCallback(async () => {
    setIsLoadingExports(true);
    try {
      const response = await fetch("/api/user/data-export");
      if (response.ok) {
        const data = await response.json();
        setExportRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch export requests:", error);
    } finally {
      setIsLoadingExports(false);
    }
  }, []);

  useEffect(() => {
    fetchConsents();
    fetchExportRequests();
  }, [fetchConsents, fetchExportRequests]);

  const handleRevokeConsent = async () => {
    if (!consentToRevoke) return;

    setIsRevoking(true);
    try {
      const response = await fetch(`/api/consents/${consentToRevoke.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User requested revocation" }),
      });

      if (response.ok) {
        // Refresh consents
        await fetchConsents();
        setConsentToRevoke(null);
        setSelectedConsent(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to revoke consent");
      }
    } catch (error) {
      console.error("Failed to revoke consent:", error);
      alert("Failed to revoke consent. Please try again.");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/user/data-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          include_profile: true,
          include_transactions: true,
          include_accounts: true,
          include_consents: true,
          include_messages: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExportData(data.data);
        // Refresh export requests
        await fetchExportRequests();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to export data");
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExportData = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finauraa-data-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportData(null);
  };

  const getConsentIcon = (type: string) => {
    switch (type) {
      case "bank_access":
        return Bank;
      case "ai_data":
        return Sparkle;
      default:
        return Shield;
    }
  };

  const getConsentTypeName = (type: string) => {
    switch (type) {
      case "bank_access":
        return "Bank Access";
      case "ai_data":
        return "AI Data Sharing";
      case "marketing":
        return "Marketing";
      case "terms_of_service":
        return "Terms of Service";
      case "privacy_policy":
        return "Privacy Policy";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>;
      case "revoked":
        return <Badge variant="destructive">Revoked</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeConsents = consents.filter((c) => c.consent_status === "active");
  const inactiveConsents = consents.filter((c) => c.consent_status !== "active");

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="Privacy & Data" />

      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Info Banner */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Info size={20} className="text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary">Your Data Rights (PDPL)</p>
                <p className="text-muted-foreground mt-1">
                  Under Bahrain&apos;s Personal Data Protection Law, you have the right to access, export, and delete your personal data at any time.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Active Consents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield size={18} />
                Your Consents
              </CardTitle>
              <CardDescription>
                Manage permissions you&apos;ve granted to Finauraa
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingConsents ? (
                <div className="p-8 flex items-center justify-center">
                  <SpinnerGap size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : activeConsents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Shield size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active consents</p>
                </div>
              ) : (
                activeConsents.map((consent, index) => {
                  const Icon = getConsentIcon(consent.consent_type);
                  const expiresIn = formatDistanceToNow(new Date(consent.consent_expires_at), { addSuffix: true });
                  const isExpiringSoon = new Date(consent.consent_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

                  return (
                    <div key={consent.id}>
                      {index > 0 && <Separator />}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon size={20} className="text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {consent.provider_name || getConsentTypeName(consent.consent_type)}
                              </p>
                              {getStatusBadge(consent.consent_status)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Clock size={12} />
                              <span className={isExpiringSoon ? "text-amber-500" : ""}>
                                Expires {expiresIn}
                              </span>
                              {isExpiringSoon && <Warning size={12} className="text-amber-500" />}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedConsent(consent)}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConsentToRevoke(consent)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Revoked/Expired Consents */}
          {inactiveConsents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Past Consents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {inactiveConsents.map((consent, index) => {
                  const Icon = getConsentIcon(consent.consent_type);

                  return (
                    <div key={consent.id}>
                      {index > 0 && <Separator />}
                      <div className="p-4 flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                            <Icon size={20} className="text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {consent.provider_name || getConsentTypeName(consent.consent_type)}
                              </p>
                              {getStatusBadge(consent.consent_status)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {consent.consent_status === "revoked"
                                ? `Revoked ${consent.revoked_at ? format(new Date(consent.revoked_at), "MMM d, yyyy") : ""}`
                                : `Expired ${format(new Date(consent.consent_expires_at), "MMM d, yyyy")}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConsent(consent)}
                        >
                          <Eye size={16} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download size={18} />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a copy of all your personal data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Includes: Profile, Transactions, Bank Accounts, Consents</p>
                  <p className="text-xs mt-1">Format: JSON (machine-readable)</p>
                </div>
                <Button onClick={handleExportData} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </div>

              {/* Recent Exports */}
              {!isLoadingExports && exportRequests.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent Exports</p>
                  <div className="space-y-2">
                    {exportRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-muted-foreground" />
                          <span>{format(new Date(req.requested_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                        <Badge variant={req.status === "completed" ? "default" : "secondary"}>
                          {req.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Deletion */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Trash size={18} />
                Delete Your Data
              </CardTitle>
              <CardDescription>
                Request deletion of your personal data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You can request deletion of specific data or your entire account. Some data may be retained for legal compliance (audit logs for 7 years per CBB regulations).
              </p>
              <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                <Trash size={16} className="mr-2" />
                Request Data Deletion
              </Button>
            </CardContent>
          </Card>

          {/* Footer Info */}
          <div className="text-center text-xs text-muted-foreground pt-4">
            <p>Protected under Bahrain Personal Data Protection Law (PDPL)</p>
            <p className="mt-1">Compliant with BOBF Open Banking Framework</p>
          </div>
        </div>
      </div>

      {/* Consent Detail Sheet */}
      <Sheet open={!!selectedConsent} onOpenChange={() => setSelectedConsent(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Consent Details</SheetTitle>
            <SheetDescription>
              View the details of this consent
            </SheetDescription>
          </SheetHeader>
          {selectedConsent && (
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {(() => {
                    const Icon = getConsentIcon(selectedConsent.consent_type);
                    return (
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon size={24} className="text-primary" />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-semibold">
                      {selectedConsent.provider_name || getConsentTypeName(selectedConsent.consent_type)}
                    </p>
                    {getStatusBadge(selectedConsent.consent_status)}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Purpose</p>
                  <p className="text-sm">{selectedConsent.purpose}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Permissions Granted</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedConsent.permissions_granted.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Given On</p>
                    <div className="flex items-center gap-1 text-sm">
                      <CalendarBlank size={14} />
                      {format(new Date(selectedConsent.consent_given_at), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Expires On</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock size={14} />
                      {format(new Date(selectedConsent.consent_expires_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>

                {selectedConsent.consent_status === "revoked" && selectedConsent.revocation_reason && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Revocation Reason</p>
                    <p className="text-sm">{selectedConsent.revocation_reason}</p>
                  </div>
                )}
              </div>

              {selectedConsent.consent_status === "active" && (
                <>
                  <Separator />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      setConsentToRevoke(selectedConsent);
                    }}
                  >
                    Revoke Consent
                  </Button>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!consentToRevoke} onOpenChange={() => setConsentToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Consent?</AlertDialogTitle>
            <AlertDialogDescription>
              {consentToRevoke?.consent_type === "bank_access" ? (
                <>
                  This will disconnect your bank and remove access to your financial data.
                  Your transaction history will be scheduled for deletion after 30 days.
                </>
              ) : consentToRevoke?.consent_type === "ai_data" ? (
                <>
                  This will switch you to Privacy-First mode. The AI assistant will no longer
                  have access to your personal financial data for insights.
                </>
              ) : (
                <>
                  This will revoke the consent and may affect related features.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConsent}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <SpinnerGap size={16} className="animate-spin mr-2" />
                  Revoking...
                </>
              ) : (
                "Revoke Consent"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Data Download Dialog */}
      <AlertDialog open={!!exportData} onOpenChange={() => setExportData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Export Ready
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your data export is ready. Click download to save the file to your device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={downloadExportData}>
              <Download size={16} className="mr-2" />
              Download JSON
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

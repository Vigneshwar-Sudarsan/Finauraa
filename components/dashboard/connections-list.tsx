"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Bank,
  Plus,
  Trash,
  SpinnerGap,
  CheckCircle,
  WarningCircle,
  Clock,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useBankConnection } from "@/hooks/use-bank-connection";

interface BankConnection {
  id: string;
  bank_id: string;
  bank_name: string;
  status: "active" | "pending" | "expired" | "revoked";
  created_at: string;
  token_expires_at: string | null;
  account_count: number;
}

export function ConnectionsList() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bank connection with consent dialog
  const { connectBank, isConnecting, ConsentDialog } = useBankConnection();

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await fetch("/api/finance/connections");
        // Silently handle 403 - will show empty state with Connect Bank prompt
        if (response.status === 403) {
          setConnections([]);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setConnections(data.connections ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch connections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, []);


  const handleDisconnect = async (connectionId: string) => {
    setDeletingId(connectionId);
    try {
      const response = await fetch(`/api/finance/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle size={16} weight="fill" className="text-green-600" />;
      case "pending":
        return <Clock size={16} className="text-yellow-600" />;
      case "expired":
      case "revoked":
        return <WarningCircle size={16} weight="fill" className="text-red-600" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-0">
        {[1, 2].map((i) => (
          <div key={i}>
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </div>
            {i < 2 && <Separator />}
          </div>
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <>
        <div className="py-8 text-center">
          <Bank size={40} className="mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No banks connected</p>
          <Button
            onClick={connectBank}
            disabled={isConnecting}
            className="mt-4"
            size="sm"
          >
            {isConnecting ? (
              <>
                <SpinnerGap size={16} className="mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Connect Bank
              </>
            )}
          </Button>
        </div>
        <ConsentDialog />
      </>
    );
  }

  return (
    <div className="space-y-0">
      {connections.map((connection, index) => (
        <div key={connection.id}>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                <Bank size={20} className="text-muted-foreground" />
              </div>

              {/* Details */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{connection.bank_name}</p>
                  {getStatusIcon(connection.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {connection.account_count} account
                  {connection.account_count !== 1 ? "s" : ""} · Connected{" "}
                  {formatDate(connection.created_at)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={deletingId === connection.id}
                >
                  {deletingId === connection.id ? (
                    <SpinnerGap size={16} className="animate-spin" />
                  ) : (
                    <Trash size={16} />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Bank</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to disconnect {connection.bank_name}?
                    This will remove all associated accounts and transactions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDisconnect(connection.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Divider */}
          {index < connections.length - 1 && <Separator />}
        </div>
      ))}

      {/* Add another bank */}
      <Separator />
      <div className="py-4">
        <Button
          variant="ghost"
          onClick={connectBank}
          disabled={isConnecting}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          {isConnecting ? (
            <>
              <SpinnerGap size={16} className="mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus size={16} className="mr-2" />
              Add another bank
            </>
          )}
        </Button>
      </div>

      {/* Bank Consent Dialog */}
      <ConsentDialog />
    </div>
  );
}
